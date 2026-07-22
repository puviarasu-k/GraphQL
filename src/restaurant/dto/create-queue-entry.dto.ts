import { IsString } from "class-validator";

export class CreateQueueEntryDto {
  @IsString()
  publicId!: string;
}
