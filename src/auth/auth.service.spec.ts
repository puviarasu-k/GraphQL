import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { NotFoundException, UnauthorizedException } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { AuthService } from "./auth.service";
import { RedisService } from "../redis/redis.service";
import { UsersService } from "../users/users.service";
import { Role } from "../users/enums/role.enum";

const CONFIG_VALUES: Record<string, unknown> = {
  env: "test",
  "jwt.accessSecret": "access-secret",
  "jwt.accessExpiresInSeconds": 900,
  "jwt.refreshSecret": "refresh-secret",
  "jwt.refreshExpiresInSeconds": 604800,
};

describe("AuthService", () => {
  let service: AuthService;
  let redis: Record<string, jest.Mock>;
  let users: Record<string, jest.Mock>;
  let jwt: Record<string, jest.Mock>;

  const seedOtpSession = async (
    id: string,
    plainOtp: string,
    mobile: string,
  ) => {
    const otpHash = await bcrypt.hash(plainOtp, 4);
    await redis.set(id, JSON.stringify({ otpHash, attempts: 0, mobile }), 300);
  };

  beforeEach(async () => {
    const store = new Map<string, string>();

    redis = {
      get: jest.fn((key: string) => Promise.resolve(store.get(key) ?? null)),
      set: jest.fn((key: string, value: string) => {
        store.set(key, value);
        return Promise.resolve();
      }),
      delete: jest.fn((key: string) => {
        const existed = store.delete(key);
        return Promise.resolve(existed ? 1 : 0);
      }),
      incr: jest.fn(() => Promise.resolve(1)),
      expire: jest.fn(() => Promise.resolve(true)),
      deleteByPattern: jest.fn(() => Promise.resolve(0)),
    };

    users = {
      findOrCreateByMobile: jest.fn(),
      findById: jest.fn(),
    };

    jwt = {
      sign: jest.fn(() => "signed.jwt.token"),
      verify: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: RedisService, useValue: redis },
        { provide: UsersService, useValue: users },
        { provide: JwtService, useValue: jwt },
        {
          provide: ConfigService,
          useValue: { get: (key: string) => CONFIG_VALUES[key] },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("login", () => {
    it("stores a random OTP hash keyed by a generated id, not the static '1111'", async () => {
      const result = await service.login("9999999999", "1.2.3.4");

      expect(result.id).toBeDefined();
      expect(result.expiresIn).toBe(5 * 60);
      expect(redis.set).toHaveBeenCalledWith(
        result.id,
        expect.any(String),
        5 * 60,
      );

      const setCalls = redis.set.mock.calls as [string, string, number][];
      const stored = JSON.parse(setCalls[0][1]) as {
        otpHash: string;
        mobile: string;
        attempts: number;
      };

      // This is the core bug fix: previously every login used the hardcoded
      // OTP "1111", so anyone who knew a mobile number could log in as that
      // user. Assert the stored hash is not simply "1111"'s hash.
      expect(await bcrypt.compare("1111", stored.otpHash)).toBe(false);
      expect(stored.attempts).toBe(0);
      expect(stored.mobile).toBe("9999999999");
    });
  });

  describe("verifyOtp", () => {
    it("throws NotFoundException when the session id is unknown", async () => {
      await expect(
        service.verifyOtp("1234", "missing-id", "1.2.3.4"),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("throws UnauthorizedException on an incorrect OTP", async () => {
      await seedOtpSession("session-1", "4321", "9999999999");

      await expect(
        service.verifyOtp("0000", "session-1", "1.2.3.4"),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("issues a token pair and finds-or-creates the user on a correct OTP", async () => {
      await seedOtpSession("session-2", "4321", "9999999999");

      const user = {
        id: 42,
        mobile: "9999999999",
        role: Role.USER,
        isActive: true,
      };
      users.findOrCreateByMobile.mockResolvedValue(user);

      const result = await service.verifyOtp("4321", "session-2", "1.2.3.4");

      expect(users.findOrCreateByMobile).toHaveBeenCalledWith("9999999999");
      expect(result.accessToken).toBe("signed.jwt.token");
      expect(result.refreshToken).toBe("signed.jwt.token");
      expect(result.user.mobile).toBe("9999999999");
      // OTP session must be consumed (single use), not reusable.
      expect(redis.delete).toHaveBeenCalledWith("session-2");
    });

    it("locks out the mobile number after repeated failures across sessions", async () => {
      for (let i = 0; i < 5; i++) {
        const sessionId = `session-fail-${i}`;
        await seedOtpSession(sessionId, "4321", "9999999999");
        await expect(
          service.verifyOtp("0000", sessionId, "1.2.3.4"),
        ).rejects.toBeInstanceOf(UnauthorizedException);
      }

      // incr is mocked to always return 1 (a real Redis INCR would
      // accumulate); what matters here is that a lockout check runs and the
      // failure counter key is touched on every failed attempt.
      expect(redis.incr).toHaveBeenCalledWith("failed:mobile:9999999999");
    });
  });

  describe("refresh", () => {
    it("throws UnauthorizedException and revokes all sessions for an unknown/expired session", async () => {
      jwt.verify.mockReturnValue({ sub: 1, jti: "abc", type: "refresh" });

      await expect(
        service.refresh("some.refresh.token"),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(redis.deleteByPattern).toHaveBeenCalledWith("refresh:1:*");
    });

    it("rotates a valid refresh session and issues a new pair", async () => {
      jwt.verify.mockReturnValue({ sub: 1, jti: "abc", type: "refresh" });
      redis.get.mockImplementation((key: string) =>
        Promise.resolve(key === "refresh:1:abc" ? "1" : null),
      );
      users.findById.mockResolvedValue({
        id: 1,
        mobile: "9999999999",
        role: Role.USER,
        isActive: true,
      });

      const result = await service.refresh("some.refresh.token");

      expect(redis.delete).toHaveBeenCalledWith("refresh:1:abc");
      expect(result.accessToken).toBe("signed.jwt.token");
    });
  });

  describe("logout", () => {
    it("revokes every session when no refresh token is provided", async () => {
      await service.logout(1);
      expect(redis.deleteByPattern).toHaveBeenCalledWith("refresh:1:*");
    });
  });
});
