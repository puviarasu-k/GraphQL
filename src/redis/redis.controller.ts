import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { RedisService } from "./redis.service";
import { RedisSetDto, isReservedKey } from "./dto/redis-set.dto";
import { Roles } from "../common/decorators/roles.decorator";
import { RolesGuard } from "../common/guards/roles.guard";
import { Role } from "../users/enums/role.enum";

/**
 * Generic Redis read/write/delete was previously a fully open, unauthenticated
 * public endpoint — anyone on the internet could read, overwrite, or delete
 * ANY key in the cache, including other users' OTP session records, rate
 * limit counters, and lockout flags (i.e. full authentication bypass and
 * account takeover). This is now:
 *   1. Behind the global JWT guard + ADMIN role (RolesGuard) — not public.
 *   2. Restricted from touching the security-critical key namespaces
 *      (see isReservedKey) even for admins, since those are internal
 *      implementation details of AuthService, not admin-manageable data.
 * Treat this controller as a debug/ops tool, not a general-purpose cache API.
 */
@Controller("admin/redis")
@UseGuards(RolesGuard)
@Roles(Role.ADMIN)
export class RedisController {
  constructor(private readonly redisService: RedisService) {}

  @Post()
  async set(@Body() body: RedisSetDto) {
    this.assertNotReserved(body.key);
    await this.redisService.set(body.key, body.value, body.ttl);
    return { key: body.key };
  }

  @Get(":key")
  async get(@Param("key") key: string) {
    this.assertNotReserved(key);
    const value = await this.redisService.get(key);
    if (value === null) {
      throw new NotFoundException("Key not found");
    }
    return { key, value };
  }

  @Delete(":key")
  async delete(@Param("key") key: string) {
    this.assertNotReserved(key);
    const deletedCount = await this.redisService.delete(key);
    if (deletedCount === 0) {
      throw new NotFoundException("Key not found");
    }
    return { key, deleted: true };
  }

  private assertNotReserved(key: string) {
    if (!/^[a-zA-Z0-9:_-]{1,200}$/.test(key)) {
      throw new BadRequestException("Invalid key format");
    }
    if (isReservedKey(key)) {
      throw new ForbiddenException(
        "This key namespace is managed internally and cannot be accessed through this API",
      );
    }
  }
}
