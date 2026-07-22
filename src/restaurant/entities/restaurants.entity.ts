import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "../../users/entities/user.entity";

@Entity({ schema: "zeroqueue", name: "restaurants" })
export class Restaurant {
  @PrimaryGeneratedColumn()
  id!: number;

  // The SELLER account that created/owns this restaurant. Required so
  // ownership can be verified server-side before letting a caller add
  // outlets or manage queues under it — role alone (`SELLER`) only proves
  // *a* seller is calling, not that they own *this* restaurant.
  @ManyToOne(() => User)
  @JoinColumn({ name: "owner_id" })
  owner!: User;

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
