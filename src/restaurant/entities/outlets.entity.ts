import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Restaurant } from "./restaurants.entity";

@Entity({ schema: "zeroqueue", name: "outlets" })
export class Outlet {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Restaurant)
  @JoinColumn({ name: "restaurant_id" })
  restaurant!: Restaurant;

  @Column({ type: "varchar", length: 255 })
  name!: string;

  @Column({ type: "varchar", length: 20, nullable: true })
  phone?: string;

  @Column({ type: "geography", spatialFeatureType: "Point", srid: 4326 })
  location!: object;

  @Column({ nullable: true }) city?: string;
  @Column({ nullable: true }) state?: string;
  @Column({ nullable: true }) country?: string;

  @Column({ type: "text", nullable: true, name: "address_line_1" })
  addressLine1?: string;
  @Column({ type: "text", nullable: true, name: "address_line_2" })
  addressLine2?: string;
  @Column({ nullable: true, name: "branch_name" }) branchName?: string;
  @Column({ type: "uuid", unique: true, name: "public_id" })
  publicId!: string;

  @Column({ default: true, name: "is_active" }) isActive!: boolean;

  @CreateDateColumn({ name: "created_at" }) createdAt!: Date;
  @UpdateDateColumn({ name: "updated_at" }) updatedAt!: Date;
}
