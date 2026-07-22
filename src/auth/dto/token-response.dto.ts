import { UserResponseDto } from "../../users/dto/user-response.dto";

export class TokenResponseDto {
  accessToken!: string;
  refreshToken!: string;
  expiresIn!: number; // access token lifetime, in seconds
  tokenType = "Bearer" as const;
  user!: UserResponseDto;
}
