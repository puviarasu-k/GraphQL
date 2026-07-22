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

@Entity({ schema: "zeroqueue", name: "staff" })
export class Staff {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Outlet)
  @JoinColumn({ name: "outlet_id" })
  outlet!: Outlet;

  @Column() name!: string;
  @Column({ unique: true, nullable: true }) email?: string;
  @Column({ nullable: true }) role?: string;
  @Column({ default: true }) isActive!: boolean;

  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
