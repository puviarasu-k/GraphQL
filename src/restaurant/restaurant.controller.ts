import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { Restaurant } from "../users/entities/restaurants.entity";
import { CreateRestaurantDto } from "./dto/create-restaurant.dto";
import { RestaurantService } from "./restaurant.service";
import { CreateOutletDto } from "./dto/create-outlet.dto";
import { Outlet } from "../users/entities/outlets.entity";
import { CreateQueueEntryDto } from "./dto/create-queue-entry.dto";
import { QueueEntryResponseDto } from "./dto/queue-entry-response.dto";
import { QueueEntry } from "../users/entities/queue-entries.entity";
import { UpdateQueueEntryStatusDto } from "./dto/update-queue-entry-status.dto";
import { Public } from "../common/decorators/public.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { RolesGuard } from "../common/guards/roles.guard";
import { Role } from "../users/enums/role.enum";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../common/strategies/jwt.strategy";
import { RestaurantResponseDto } from "./dto/restaurant-response.dto";

@Controller("restaurants")
@UseGuards(RolesGuard)
export class RestaurantController {
  constructor(private readonly restaurantService: RestaurantService) {}

  // Browsing restaurants/outlets is fine for anyone — the customer app
  // needs this before a user has even logged in.
  @Get()
  @Public()
  findAll(): Promise<RestaurantResponseDto[]> {
    return this.restaurantService.findAll();
  }

  @Get(":publicId")
  @Public()
  findOutletDetails(@Param("publicId") publicId: string) {
    return this.restaurantService.findOutletDetails(publicId);
  }

  // Business-management actions: restricted to the SELLER app, and the
  // service layer further checks the caller actually owns/staffs the
  // specific restaurant/outlet targeted (role alone isn't enough — see
  // RestaurantService).
  @Post("/outlet")
  @Roles(Role.SELLER)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  createOutlet(
    @Body() createOutletDto: CreateOutletDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Outlet> {
    return this.restaurantService.createOutlet(createOutletDto, user.id);
  }

  // Joining a queue is a customer (USER) action; userId is taken from the
  // caller's own token in the service, never from the request body.
  @Post("/queue-entry")
  @Roles(Role.USER)
  createQueueEntry(
    @Body() createQueueEntryDto: CreateQueueEntryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<QueueEntryResponseDto> {
    return this.restaurantService.createQueueEntry(
      createQueueEntryDto,
      user.id,
    );
  }

  // Calling/completing/cancelling a token is a restaurant-staff action.
  // This route used to be @Public() with no auth at all.
  @Post("/queue-entry/status")
  @Roles(Role.SELLER)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  updateQueueEntryStatus(
    @Body() updateQueueEntryStatusDto: UpdateQueueEntryStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<QueueEntry> {
    return this.restaurantService.updateQueueEntryStatus(
      updateQueueEntryStatusDto,
      user.id,
    );
  }

  @Post()
  @Roles(Role.SELLER)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  create(
    @Body() createRestaurantDto: CreateRestaurantDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Restaurant> {
    return this.restaurantService.create(createRestaurantDto, user.id);
  }
}
