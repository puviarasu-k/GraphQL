import { IsInt, IsString, Min } from "class-validator";

export class CreateQueueEntryDto {
  @IsInt()
  @Min(1)
  userId!: number;

  @IsString()
  publicId!: string;
}
