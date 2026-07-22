import { Type } from "class-transformer";
import { IsEnum, IsInt, IsString, Min } from "class-validator";
import { QueueStatus } from "../entities/queue-entries.entity";

export class UpdateQueueEntryStatusDto {
  @IsString()
  publicId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  queueEntryId!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  tokenNumber!: number;

  @IsEnum(QueueStatus)
  status!: QueueStatus;
}
