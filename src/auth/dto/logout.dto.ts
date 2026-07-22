import { IsJWT, IsOptional } from "class-validator";

export class LogoutDto {
  // Omit to log out of every device/session for this user; provide the
  // current refresh token to revoke only that one session.
  @IsOptional()
  @IsJWT()
  refreshToken?: string;
}
