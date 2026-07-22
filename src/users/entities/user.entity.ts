import {
  Entity,
  Column,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  CreateDateColumn,
} from "typeorm";
import { Role } from "../enums/role.enum";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn({ type: "int" })
  id!: number;

  @Column({ type: "varchar", length: 255, nullable: true })
  name?: string;

  // Unique so two accounts can never be created for the same mobile number
  // (previously unenforced, which let the OTP login flow silently create
  // duplicate users for the same number under race conditions).
  @Index({ unique: true })
  @Column({ type: "varchar", length: 20 })
  mobile!: string;

  @Column({ type: "enum", enum: Role, default: Role.USER })
  role!: Role;

  @Column({
    type: "geography",
    spatialFeatureType: "Point",
    srid: 4326,
    nullable: true,
  })
  location!: object;

  @Column({ type: "boolean", default: true })
  isActive!: boolean;

  @CreateDateColumn({
    type: "timestamp",
    default: () => "CURRENT_TIMESTAMP",
  })
  createdAt!: Date;

  @UpdateDateColumn({
    type: "timestamp",
    default: () => "CURRENT_TIMESTAMP",
    onUpdate: "CURRENT_TIMESTAMP",
  })
  updatedAt!: Date;
}
