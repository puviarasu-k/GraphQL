import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { randomInt, randomUUID } from "node:crypto";
import { RedisService } from "../redis/redis.service";
import { UsersService } from "../users/users.service";
import { User } from "../users/entities/user.entity";
import { Role } from "../users/enums/role.enum";
import { UserResponseDto } from "../users/dto/user-response.dto";
import { TokenResponseDto } from "./dto/token-response.dto";

interface OtpRecord {
  otpHash: string;
  attempts: number;
  mobile: string;
}

interface AccessTokenPayload {
  sub: number;
  mobile: string;
  role: Role;
  jti: string;
  type: "access";
}

interface RefreshTokenPayload {
  sub: number;
  jti: string;
  type: "refresh";
}

const OTP_TTL_SECONDS = 5 * 60; // OTP session valid for 5 minutes
const MAX_OTP_ATTEMPTS = 3; // wrong guesses allowed against a single id

// Rate limiting
const LOGIN_RATE_LIMIT_PER_MOBILE = 5; // OTP requests
const LOGIN_RATE_LIMIT_WINDOW_MOBILE = 15 * 60; // seconds
const LOGIN_RATE_LIMIT_PER_IP = 20;
const LOGIN_RATE_LIMIT_WINDOW_IP = 60 * 60;

// Lockout escalation — tracked per-mobile, independent of `id`, so
// switching to a fresh id doesn't reset an attacker's budget.
const LOCKOUT_THRESHOLD = 5; // failed verifications across any id
const LOCKOUT_WINDOW_SECONDS = 15 * 60;
const LOCKOUT_COOLDOWN_SECONDS = 30 * 60;

const BCRYPT_SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(
    mobile: string,
    ipAddress: string,
  ): Promise<{ id: string; expiresIn: number }> {
    await this.assertNotLockedOut(mobile);
    await this.enforceRateLimit(mobile, ipAddress);

    const id = randomUUID();

    // BUG FIX: the previous implementation always used the hardcoded OTP
    // "1111" for every login, for every user — anyone who knew a mobile
    // number could authenticate as that user without ever seeing an SMS.
    // A cryptographically random 4-digit OTP is generated per request instead.
    const plainOtp = randomInt(0, 10000).toString().padStart(4, "0");
    const otpHash = await bcrypt.hash(plainOtp, BCRYPT_SALT_ROUNDS);

    const record: OtpRecord = { otpHash, attempts: 0, mobile };
    await this.redisService.set(id, JSON.stringify(record), OTP_TTL_SECONDS);

    // TODO: integrate an SMS provider (Twilio/MSG91/etc) and send `plainOtp`
    // to `mobile` there. Until that's wired up, it's logged so the flow is
    // testable in non-production environments. Never log the OTP in
    // production once a real SMS provider is in place.
    if (this.configService.get<string>("env") !== "production") {
      this.logger.debug(`OTP for ${mobile} (id=${id}): ${plainOtp}`);
    }

    this.audit("otp_requested", { mobile, id, ipAddress });

    return { id, expiresIn: OTP_TTL_SECONDS };
  }

  async verifyOtp(
    userOtp: string,
    id: string,
    ipAddress: string,
  ): Promise<TokenResponseDto> {
    const otpDetails = await this.redisService.get(id);
    if (!otpDetails) {
      this.audit("otp_verify_not_found", { id, ipAddress });
      throw new NotFoundException("OTP session not found or expired");
    }

    let record: OtpRecord;
    try {
      record = JSON.parse(otpDetails) as OtpRecord;
    } catch (err) {
      this.logger.error(
        `Failed to parse OTP record for id=${id}`,
        (err as Error).stack,
      );
      throw new HttpException(
        "Something went wrong, please request a new OTP",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const { attempts, mobile } = record;

    await this.assertNotLockedOut(mobile);

    if (attempts >= MAX_OTP_ATTEMPTS) {
      throw new HttpException(
        "Too many incorrect attempts. Please request a new OTP.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // bcrypt.compare is a constant-time comparison of the hash — avoids
    // leaking timing info about how many characters matched.
    const isMatch = await bcrypt.compare(userOtp, record.otpHash);

    if (!isMatch) {
      const updatedRecord: OtpRecord = { ...record, attempts: attempts + 1 };
      await this.redisService.set(
        id,
        JSON.stringify(updatedRecord),
        OTP_TTL_SECONDS,
      );

      const totalFailures = await this.recordFailedAttempt(mobile);
      this.audit("otp_verify_failed", { mobile, id, ipAddress, totalFailures });

      if (totalFailures >= LOCKOUT_THRESHOLD) {
        await this.redisService.set(
          `lockout:mobile:${mobile}`,
          "1",
          LOCKOUT_COOLDOWN_SECONDS,
        );
        this.audit("mobile_locked_out", { mobile, ipAddress });
      }

      throw new UnauthorizedException("OTP entered is incorrect");
    }

    await this.redisService.delete(id);
    await this.clearFailedAttempts(mobile);

    // BUG FIX: a successful OTP check previously never created/looked up a
    // User row and returned a hardcoded, unsigned string ('asas') as the
    // "token" — anyone could forge it, and there was no real account behind
    // a login. Now a real user record backs every session and real signed
    // JWTs are issued.
    const user = await this.usersService.findOrCreateByMobile(mobile);

    this.audit("otp_verify_success", {
      mobile,
      id,
      ipAddress,
      userId: user.id,
    });

    return this.issueTokenPair(user);
  }

  async refresh(refreshToken: string): Promise<TokenResponseDto> {
    const payload = this.verifyRefreshToken(refreshToken);

    const sessionKey = `refresh:${payload.sub}:${payload.jti}`;
    const stillValid = await this.redisService.get(sessionKey);

    if (!stillValid) {
      // The refresh token is cryptographically valid but its session was
      // never issued or was already used/revoked: treat as possible replay
      // of a stolen token and revoke every session for this user.
      await this.redisService.deleteByPattern(`refresh:${payload.sub}:*`);
      this.audit("refresh_reuse_detected", { userId: payload.sub });
      throw new UnauthorizedException("Session expired, please log in again");
    }

    // Rotate: the presented refresh token can never be used again.
    await this.redisService.delete(sessionKey);

    const user = await this.usersService.findById(payload.sub);
    if (!user.isActive) {
      throw new ForbiddenException("Account is disabled");
    }

    return this.issueTokenPair(user);
  }

  async logout(userId: number, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      const payload = this.verifyRefreshToken(refreshToken);
      if (payload.sub !== userId) {
        throw new ForbiddenException("Token does not belong to this user");
      }
      await this.redisService.delete(`refresh:${userId}:${payload.jti}`);
      return;
    }
    // No specific token supplied: log out of every device/session.
    await this.redisService.deleteByPattern(`refresh:${userId}:*`);
  }

  // ---- Token issuance ---------------------------------------------------

  private issueTokenPair(user: User): TokenResponseDto {
    const accessJti = randomUUID();
    const accessPayload: AccessTokenPayload = {
      sub: user.id,
      mobile: user.mobile,
      role: user.role,
      jti: accessJti,
      type: "access",
    };
    const accessToken = this.jwtService.sign(accessPayload, {
      secret: this.configService.get<string>("jwt.accessSecret"),
      expiresIn: this.configService.get<number>("jwt.accessExpiresInSeconds"),
    });

    const refreshJti = randomUUID();
    const refreshPayload: RefreshTokenPayload = {
      sub: user.id,
      jti: refreshJti,
      type: "refresh",
    };
    const refreshToken = this.jwtService.sign(refreshPayload, {
      secret: this.configService.get<string>("jwt.refreshSecret"),
      expiresIn: this.configService.get<number>("jwt.refreshExpiresInSeconds"),
    });

    // Storing the refresh session server-side (keyed by jti) is what makes
    // rotation-on-use and revocation-on-logout/reuse-detection possible;
    // a bare stateless JWT can't be invalidated before it expires.
    const refreshTtl = this.configService.get<number>(
      "jwt.refreshExpiresInSeconds",
    )!;
    void this.redisService.set(
      `refresh:${user.id}:${refreshJti}`,
      "1",
      refreshTtl,
    );

    const response = new TokenResponseDto();
    response.accessToken = accessToken;
    response.refreshToken = refreshToken;
    response.expiresIn = this.configService.get<number>(
      "jwt.accessExpiresInSeconds",
    )!;
    response.user = UserResponseDto.fromEntity(user);
    return response;
  }

  private verifyRefreshToken(token: string): RefreshTokenPayload {
    try {
      const payload = this.jwtService.verify<RefreshTokenPayload>(token, {
        secret: this.configService.get<string>("jwt.refreshSecret"),
      });
      if (payload.type !== "refresh") {
        throw new Error("wrong token type");
      }
      return payload;
    } catch {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }
  }

  // ---- Lockout ------------------------------------------------------------

  private async assertNotLockedOut(mobile: string): Promise<void> {
    const isLockedOut = await this.redisService.get(`lockout:mobile:${mobile}`);
    if (isLockedOut) {
      throw new HttpException(
        "Too many failed attempts. Please try again after some time.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private async recordFailedAttempt(mobile: string): Promise<number> {
    return this.incrementWithExpiry(
      `failed:mobile:${mobile}`,
      LOCKOUT_WINDOW_SECONDS,
    );
  }

  private async clearFailedAttempts(mobile: string): Promise<void> {
    await this.redisService.delete(`failed:mobile:${mobile}`);
    await this.redisService.delete(`lockout:mobile:${mobile}`);
  }

  // ---- Rate limiting ------------------------------------------------------

  private async enforceRateLimit(
    mobile: string,
    ipAddress: string,
  ): Promise<void> {
    const mobileCount = await this.incrementWithExpiry(
      `ratelimit:login:mobile:${mobile}`,
      LOGIN_RATE_LIMIT_WINDOW_MOBILE,
    );
    if (mobileCount > LOGIN_RATE_LIMIT_PER_MOBILE) {
      this.audit("rate_limited_mobile", { mobile, ipAddress });
      throw new HttpException(
        "Too many OTP requests for this number. Please try again later.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const ipCount = await this.incrementWithExpiry(
      `ratelimit:login:ip:${ipAddress}`,
      LOGIN_RATE_LIMIT_WINDOW_IP,
    );
    if (ipCount > LOGIN_RATE_LIMIT_PER_IP) {
      this.audit("rate_limited_ip", { mobile, ipAddress });
      throw new HttpException(
        "Too many requests from this network. Please try again later.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private async incrementWithExpiry(
    key: string,
    ttlSeconds: number,
  ): Promise<number> {
    const count = await this.redisService.incr(key);
    if (count === 1) {
      await this.redisService.expire(key, ttlSeconds);
    }
    return count;
  }

  // ---- Audit logging --------------------------------------------------

  private audit(
    event: string,
    meta: Record<string, string | number | undefined>,
  ): void {
    this.logger.log(
      JSON.stringify({ event, timestamp: new Date().toISOString(), ...meta }),
    );
  }
}
