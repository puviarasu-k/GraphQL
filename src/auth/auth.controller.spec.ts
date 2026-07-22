import { Test, TestingModule } from "@nestjs/testing";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";

describe("AuthController", () => {
  let controller: AuthController;
  let authService: Record<string, jest.Mock>;

  beforeEach(async () => {
    authService = {
      login: jest.fn(),
      verifyOtp: jest.fn(),
      refresh: jest.fn(),
      logout: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  it("delegates login to AuthService with mobile and ip", async () => {
    authService.login.mockResolvedValue({ id: "abc", expiresIn: 300 });

    const result = await controller.login({ mobile: "9999999999" }, "1.2.3.4");

    expect(authService.login).toHaveBeenCalledWith("9999999999", "1.2.3.4");
    expect(result).toEqual({ id: "abc", expiresIn: 300 });
  });

  it("delegates logout to AuthService with the current user id", async () => {
    authService.logout.mockResolvedValue(undefined);

    const result = await controller.logout(
      { id: 1, mobile: "9999999999", role: "USER" as never },
      {},
    );

    expect(authService.logout).toHaveBeenCalledWith(1, undefined);
    expect(result).toEqual({ loggedOut: true });
  });
});
