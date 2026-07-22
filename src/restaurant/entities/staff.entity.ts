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
import { User } from "../../users/entities/user.entity";

@Entity({ schema: "zeroqueue", name: "staff" })
export class Staff {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Outlet)
  @JoinColumn({ name: "outlet_id" })
  outlet!: Outlet;

  // Links this staff row to the SELLER account that logs in to operate it.
  // Nullable because a staff record can be created (e.g. a name on a
  // roster) before that person has ever logged in and been matched to an
  // account. Server-side authorization for outlet actions is granted only
  // once this is set and matches the caller's user id.
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "user_id" })
  user?: User;

  @Column() name!: string;
  @Column({ unique: true, nullable: true }) email?: string;
  @Column({ nullable: true }) role?: string;
  @Column({ default: true }) isActive!: boolean;

  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
