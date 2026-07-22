import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Outlet } from "./outlets.entity";

@Entity({ schema: "zeroqueue", name: "queue_sessions" })
export class QueueSession {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Outlet)
  @JoinColumn({ name: "outlet_id" })
  outlet!: Outlet;

  @Column({ type: "date", name: "business_date" })
  businessDate!: string;

  @Column({ default: 0, name: "current_token" })
  currentToken!: number;

  @CreateDateColumn({ name: "created_at" }) createdAt!: Date;
  @UpdateDateColumn({ name: "updated_at" }) updatedAt!: Date;
}
