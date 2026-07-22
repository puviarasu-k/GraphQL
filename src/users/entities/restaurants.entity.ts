import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ schema: "zeroqueue", name: "restaurants" })
export class Restaurant {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 255 })
  name!: string;

  @Column({ type: "text", nullable: true, name: "logo_url" })
  logoUrl?: string;

  @CreateDateColumn({
    type: "timestamp",
    default: () => "CURRENT_TIMESTAMP",
    name: "created_at",
  })
  createdAt!: Date;

  @UpdateDateColumn({
    type: "timestamp",
    default: () => "CURRENT_TIMESTAMP",
    onUpdate: "CURRENT_TIMESTAMP",
    name: "updated_at",
  })
  updatedAt!: Date;
}
