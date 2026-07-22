import {
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

export class CreateOutletDto {
  @IsInt()
  @Min(1)
  restaurantId!: number;

  @IsString()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsObject()
  location!: object;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  addressLine1?: string;

  @IsOptional()
  @IsString()
  addressLine2?: string;

  @IsOptional()
  @IsString()
  branchName?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
