import {
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
} from "class-validator";
import { Gender } from "../enums/gender.enum";
import { Type } from "class-transformer";

export class UserDto {
  @IsString()
  firstName!: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsEnum(Gender)
  gender!: Gender;

  @Type(() => Number)
  @IsLatitude()
  latitude!: number;

  @Type(() => Number)
  @IsLongitude()
  longitude!: number;
}
