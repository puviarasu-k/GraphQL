import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { QueueSession } from "./queue-sessions.entity";

export enum QueueStatus {
  WAITING = "WAITING",
  CALLED = "CALLED",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

@Entity({ schema: "zeroqueue", name: "queue_entries" })
export class QueueEntry {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => QueueSession)
  @JoinColumn({ name: "queue_session_id" })
  queueSessionId!: QueueSession;

  @Column({ name: "user_id" })
  userId!: number;

  @Column({ name: "token_number" })
  tokenNumber!: number;

  @Column({ type: "enum", enum: QueueStatus, default: QueueStatus.WAITING })
  status!: QueueStatus;

  @Column({ type: "timestamp", nullable: true, name: "joined_at" })
  joinedAt?: Date;

  @Column({ type: "timestamp", nullable: true, name: "called_at" })
  calledAt?: Date;

  @Column({ type: "timestamp", nullable: true, name: "completed_at" })
  completedAt?: Date;

  @Column({ type: "timestamp", nullable: true, name: "cancelled_at" })
  cancelledAt?: Date;

  @CreateDateColumn({ name: "created_at" }) createdAt!: Date;
  @UpdateDateColumn({ name: "updated_at" }) updatedAt!: Date;
}
