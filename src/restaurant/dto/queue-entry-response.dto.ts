import { QueueStatus } from "../../users/entities/queue-entries.entity";

export class QueueEntryResponseDto {
  restaurantName!: string;
  currentToken!: number;
  lastTokenStatus!: QueueStatus | null;
}
