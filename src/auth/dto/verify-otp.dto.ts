import { IsNumberString, IsUUID, Length } from "class-validator";

export class VerifyOtpDto {
  @IsUUID()
  id!: string;

  @IsNumberString()
  @Length(4, 4)
  otp!: string;
}
