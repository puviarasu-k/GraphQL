import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Ip,
  Post,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { VerifyOtpDto } from "./dto/verify-otp.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { LogoutDto } from "./dto/logout.dto";
import { TokenResponseDto } from "./dto/token-response.dto";
import { Public } from "../common/decorators/public.decorator";
import { ResponseMessage } from "../common/decorators/response-message.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../common/strategies/jwt.strategy";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ResponseMessage("OTP sent successfully")
  // Extra per-route throttle on top of the global limiter and the
  // application-level per-mobile/per-IP limits already enforced inside
  // AuthService (defense in depth against OTP-spam/enumeration).
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  login(@Body() loginDto: LoginDto, @Ip() ipAddress: string) {
    return this.authService.login(loginDto.mobile, ipAddress);
  }

  @Public()
  @Post("verify-otp")
  @HttpCode(HttpStatus.OK)
  @ResponseMessage("Login successful")
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  verifyOtp(
    @Body() verifyOtpDto: VerifyOtpDto,
    @Ip() ipAddress: string,
  ): Promise<TokenResponseDto> {
    return this.authService.verifyOtp(
      verifyOtpDto.otp,
      verifyOtpDto.id,
      ipAddress,
    );
  }

  @Public()
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @ResponseMessage("Token refreshed successfully")
  refresh(@Body() dto: RefreshTokenDto): Promise<TokenResponseDto> {
    return this.authService.refresh(dto.refreshToken);
  }

  // Not @Public(): requires a valid access token, so only the session owner
  // can log themselves out.
  @Post("logout")
  @HttpCode(HttpStatus.OK)
  @ResponseMessage("Logged out successfully")
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: LogoutDto,
  ): Promise<{ loggedOut: true }> {
    await this.authService.logout(user.id, dto.refreshToken);
    return { loggedOut: true };
  }
}
