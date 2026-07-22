import { IsOptional, IsString, IsUrl, MaxLength } from "class-validator";

export class CreateRestaurantDto {
  @IsString()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsUrl()
  logoUrl?: string;
}
