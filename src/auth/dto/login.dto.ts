import { IsString, Matches } from "class-validator";

export class LoginDto {
  // Indian mobile numbers: 10 digits, first digit 6-9. Adjust the pattern
  // (and consider a country-code field) if the product needs to support
  // other locales.
  @IsString()
  @Matches(/^[6-9]\d{9}$/, {
    message: "Invalid mobile number",
  })
  mobile!: string;
}
