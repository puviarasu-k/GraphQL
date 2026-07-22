import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { getRandomValues } from "node:crypto";
import { DataSource, Repository } from "typeorm";
import { Restaurant } from "../users/entities/restaurants.entity";
import { CreateRestaurantDto } from "./dto/create-restaurant.dto";
import { Outlet } from "src/users/entities/outlets.entity";
import { QueueSession } from "src/users/entities/queue-sessions.entity";
import {
  QueueEntry,
  QueueStatus,
} from "src/users/entities/queue-entries.entity";
import { CreateOutletDto } from "./dto/create-outlet.dto";
import { CreateQueueEntryDto } from "./dto/create-queue-entry.dto";
import { QueueEntryResponseDto } from "./dto/queue-entry-response.dto";
import { UpdateQueueEntryStatusDto } from "./dto/update-queue-entry-status.dto";
import { EventsGateway } from "../events/events.gateway";

@Injectable()
export class RestaurantService {
  constructor(
    @InjectRepository(Restaurant)
    private readonly restaurantsRepository: Repository<Restaurant>,
    @InjectRepository(Outlet)
    private readonly outletsRepository: Repository<Outlet>,
    @InjectRepository(QueueSession)
    private readonly queueSessionsRepository: Repository<QueueSession>,
    private readonly dataSource: DataSource,
    private readonly eventsGateway: EventsGateway,
  ) {}

  findAll(): Promise<Restaurant[]> {
    return this.restaurantsRepository.find({ order: { name: "ASC" } });
  }

  async create(createRestaurantDto: CreateRestaurantDto): Promise<Restaurant> {
    const savedRestaurant =
      await this.restaurantsRepository.save(createRestaurantDto);
    return savedRestaurant;
  }

  async createOutlet(createOutletDto: CreateOutletDto): Promise<Outlet> {
    const { restaurantId, ...outletData } = createOutletDto;
    const restaurant = await this.restaurantsRepository.findOneBy({
      id: restaurantId,
    });

    if (!restaurant) {
      throw new NotFoundException("Restaurant not found");
    }

    const outlet = this.outletsRepository.create({
      ...outletData,
      restaurant,
      publicId: this.generatePublicId(),
    });
    return this.outletsRepository.save(outlet);
  }

  async findOutletDetails(publicId: string) {
    const outlet = await this.outletsRepository.findOne({
      where: { publicId },
      relations: { restaurant: true },
    });

    if (!outlet) {
      throw new NotFoundException("Outlet not found");
    }

    const queueSessions = await this.queueSessionsRepository.find({
      where: { outlet: { id: outlet.id } },
      order: { businessDate: "DESC" },
    });

    return {
      restaurant: {
        id: outlet.restaurant.id,
        name: outlet.restaurant.name,
        logoUrl: outlet.restaurant.logoUrl,
      },
      outlet: {
        id: outlet.id,
        name: outlet.name,
        phone: outlet.phone,
        location: outlet.location,
        city: outlet.city,
        state: outlet.state,
        country: outlet.country,
        addressLine1: outlet.addressLine1,
        addressLine2: outlet.addressLine2,
        branchName: outlet.branchName,
        publicId: outlet.publicId,
        isActive: outlet.isActive,
      },
      queueSessions: queueSessions.map((queueSession) => ({
        id: queueSession.id,
        businessDate: queueSession.businessDate,
        currentToken: queueSession.currentToken,
      })),
    };
  }

  async createQueueEntry(
    createQueueEntryDto: CreateQueueEntryDto,
  ): Promise<QueueEntryResponseDto> {
    const businessDate = new Date().toISOString().slice(0, 10);

    return this.dataSource.transaction<QueueEntryResponseDto>(
      async (manager) => {
        // Lock the outlet for the duration of allocation so concurrent requests
        // cannot read the same current token and issue a duplicate number.
        const outlet = await manager
          .getRepository(Outlet)
          .createQueryBuilder("outlet")
          .innerJoinAndSelect("outlet.restaurant", "restaurant")
          .where("outlet.public_id = :publicId", {
            publicId: createQueueEntryDto.publicId,
          })
          .setLock("pessimistic_write")
          .getOne();

        if (!outlet) {
          throw new NotFoundException("Outlet not found");
        }

        const queueSessionsRepository = manager.getRepository(QueueSession);
        const queueEntriesRepository = manager.getRepository(QueueEntry);
        let queueSession = await queueSessionsRepository.findOne({
          where: { outlet: { id: outlet.id }, businessDate },
        });

        const lastQueueEntry = queueSession
          ? await queueEntriesRepository.findOne({
              where: {
                queueSessionId: { id: queueSession.id },
                tokenNumber: queueSession.currentToken,
              },
            })
          : null;

        const currentToken = (queueSession?.currentToken ?? 0) + 1;

        if (queueSession) {
          queueSession.currentToken = currentToken;
        } else {
          queueSession = queueSessionsRepository.create({
            outlet,
            businessDate,
            currentToken,
          });
        }
        queueSession = await queueSessionsRepository.save(queueSession);

        await queueEntriesRepository.save(
          queueEntriesRepository.create({
            queueSessionId: queueSession,
            userId: createQueueEntryDto.userId,
            tokenNumber: currentToken,
            status: QueueStatus.WAITING,
            joinedAt: new Date(),
          }),
        );

        return {
          restaurantName: outlet.restaurant.name,
          currentToken,
          lastTokenStatus: lastQueueEntry?.status ?? null,
        };
      },
    );
  }

  async updateQueueEntryStatus(
    updateQueueEntryStatusDto: UpdateQueueEntryStatusDto,
  ): Promise<QueueEntry> {
    const { publicId, queueEntryId, tokenNumber, status } =
      updateQueueEntryStatusDto;

    const queueEntry = await this.dataSource.transaction(async (manager) => {
      // Ensure the entry belongs to the outlet represented by the public ID;
      // checking the entry ID and token alone could update another outlet's queue.
      const entry = await manager
        .getRepository(QueueEntry)
        .createQueryBuilder("queueEntry")
        .innerJoinAndSelect("queueEntry.queueSessionId", "queueSession")
        .innerJoinAndSelect("queueSession.outlet", "outlet")
        .where("queueEntry.id = :queueEntryId", { queueEntryId })
        .andWhere("queueEntry.token_number = :tokenNumber", { tokenNumber })
        .andWhere("outlet.public_id = :publicId", { publicId })
        .getOne();

      if (!entry) {
        throw new NotFoundException(
          "Queue entry not found for the specified outlet and token",
        );
      }

      entry.status = status;
      const updatedAt = new Date();
      switch (status) {
        case QueueStatus.CALLED:
          entry.calledAt = updatedAt;
          break;
        case QueueStatus.COMPLETED:
          entry.completedAt = updatedAt;
          break;
        case QueueStatus.CANCELLED:
          entry.cancelledAt = updatedAt;
          break;
      }

      return manager.getRepository(QueueEntry).save(entry);
    });

    if (status === QueueStatus.COMPLETED) {
      this.eventsGateway.emitQueueUpdate(publicId, {
        currentToken: queueEntry.tokenNumber,
      });
    }

    return queueEntry;
  }

  private generatePublicId(): string {
    const bytes = getRandomValues(new Uint8Array(16));

    // Format cryptographically random bytes as a RFC 4122 version 4 UUID.
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Buffer.from(bytes).toString("hex");

    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
}
