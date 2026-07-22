import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { Restaurant } from "../users/entities/restaurants.entity";
import { CreateRestaurantDto } from "./dto/create-restaurant.dto";
import { RestaurantService } from "./restaurant.service";
import { CreateOutletDto } from "./dto/create-outlet.dto";
import { Outlet } from "src/users/entities/outlets.entity";
import { CreateQueueEntryDto } from "./dto/create-queue-entry.dto";
import { QueueEntryResponseDto } from "./dto/queue-entry-response.dto";
import { QueueEntry } from "../users/entities/queue-entries.entity";
import { UpdateQueueEntryStatusDto } from "./dto/update-queue-entry-status.dto";
import { Public } from "src/common/decorators/public.decorator";

@Controller("restaurants")
export class RestaurantController {
  constructor(private readonly restaurantService: RestaurantService) {}

  @Get()
  findAll(): Promise<Restaurant[]> {
    return this.restaurantService.findAll();
  }

  @Get(":publicId")
  findOutletDetails(@Param("publicId") publicId: string) {
    return this.restaurantService.findOutletDetails(publicId);
  }

  @Post("/outlet")
  createOutlet(@Body() createOutletDto: CreateOutletDto): Promise<Outlet> {
    return this.restaurantService.createOutlet(createOutletDto);
  }

  @Post("/queue-entry")
  createQueueEntry(
    @Body() createQueueEntryDto: CreateQueueEntryDto,
  ): Promise<QueueEntryResponseDto> {
    return this.restaurantService.createQueueEntry(createQueueEntryDto);
  }

  @Post("/queue-entry/status")
  @Public()
  updateQueueEntryStatus(
    @Body() updateQueueEntryStatusDto: UpdateQueueEntryStatusDto,
  ): Promise<QueueEntry> {
    return this.restaurantService.updateQueueEntryStatus(
      updateQueueEntryStatusDto,
    );
  }

  @Post()
  create(
    @Body() createRestaurantDto: CreateRestaurantDto,
  ): Promise<Restaurant> {
    return this.restaurantService.create(createRestaurantDto);
  }
}
