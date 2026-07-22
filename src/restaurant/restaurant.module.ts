import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Outlet } from "../users/entities/outlets.entity";
import { QueueEntry } from "../users/entities/queue-entries.entity";
import { QueueSession } from "../users/entities/queue-sessions.entity";
import { Restaurant } from "../users/entities/restaurants.entity";
import { Staff } from "../users/entities/staff.entity";
import { User } from "../users/entities/user.entity";
import { EventsModule } from "../events/events.module";
import { RestaurantController } from "./restaurant.controller";
import { RestaurantService } from "./restaurant.service";

@Module({
  // Keep the complete restaurant domain table graph available to providers
  // added to this module (restaurants, outlets, queues, staff, and users).
  imports: [
    EventsModule,
    TypeOrmModule.forFeature([
      Restaurant,
      Outlet,
      QueueSession,
      QueueEntry,
      Staff,
      User,
    ]),
  ],
  controllers: [RestaurantController],
  providers: [RestaurantService],
  exports: [RestaurantService],
})
export class RestaurantModule {}
