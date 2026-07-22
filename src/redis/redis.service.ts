import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly redis: Redis;
  private readonly logger = new Logger(RedisService.name);

  constructor(private readonly configService: ConfigService) {
    this.redis = new Redis({
      host: this.configService.get<string>("redis.host"),
      port: this.configService.get<number>("redis.port"),
      password: this.configService.get<string>("redis.password"),
      db: this.configService.get<number>("redis.db"),
      // Don't crash-loop the whole process on a transient connection issue;
      // ioredis will retry with backoff.
      retryStrategy: (times) => Math.min(times * 200, 5000),
    });

    this.redis.on("connect", () => this.logger.log("Redis connected"));
    this.redis.on("error", (err) =>
      this.logger.error("Redis error", err.stack),
    );
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.redis.set(key, value, "EX", ttl);
    } else {
      await this.redis.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    return this.redis.get(key);
  }

  async delete(key: string): Promise<number> {
    return this.redis.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const exists = await this.redis.exists(key);
    return exists === 1;
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    const result = await this.redis.expire(key, seconds);
    return result === 1;
  }

  async incr(key: string): Promise<number> {
    return this.redis.incr(key);
  }

  async ttl(key: string): Promise<number> {
    return this.redis.ttl(key);
  }

  /**
   * Deletes every key matching a pattern using SCAN (not KEYS, which blocks
   * the single-threaded Redis event loop and is unsafe on a large production
   * dataset). Used e.g. to revoke all of a user's refresh token sessions.
   */
  async deleteByPattern(pattern: string): Promise<number> {
    let cursor = "0";
    let deleted = 0;
    do {
      const [nextCursor, keys] = await this.redis.scan(
        cursor,
        "MATCH",
        pattern,
        "COUNT",
        100,
      );
      cursor = nextCursor;
      if (keys.length > 0) {
        deleted += await this.redis.del(...keys);
      }
    } while (cursor !== "0");
    return deleted;
  }

  /** Destructive; not exposed via any controller. Dev/ops use only. */
  async flush(): Promise<void> {
    await this.redis.flushdb();
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }
}
