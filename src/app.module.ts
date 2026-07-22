import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { PassportModule } from "@nestjs/passport";

import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { RedisModule } from "./redis/redis.module";
import { EventsModule } from "./events/events.module";
import { User } from "./users/entities/user.entity";
import { Restaurant } from "./users/entities/restaurants.entity";
import { Outlet } from "./users/entities/outlets.entity";
import { QueueSession } from "./users/entities/queue-sessions.entity";
import { QueueEntry } from "./users/entities/queue-entries.entity";
import { Staff } from "./users/entities/staff.entity";

import configuration from "./config/configuration";
import { validate } from "./config/env.validation";

import { JwtStrategy } from "./common/strategies/jwt.strategy";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { ResponseInterceptor } from "./common/interceptors/response.interceptor";
import { RequestContextMiddleware } from "./common/middleware/request-context.middleware";
import { RestaurantModule } from "./restaurant/restaurant.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate,
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: "postgres",
        host: config.get<string>("database.host"),
        port: config.get<number>("database.port"),
        username: config.get<string>("database.username"),
        password: config.get<string>("database.password"),
        database: config.get<string>("database.database"),
        entities: [User, Restaurant, Outlet, QueueSession, QueueEntry, Staff],
        // BUG FIX: previously hardcoded to `root`/`root`/localhost directly
        // in this file (secrets committed to source control) with no way to
        // configure per-environment. Now sourced from validated env vars.
        // `synchronize` defaults to false and must be explicitly opted into
        // via DB_SYNCHRONIZE=true for local dev only — never in production;
        // use migrations for schema changes instead.
        synchronize: config.get<boolean>("database.synchronize"),
      }),
    }),

    // Baseline, app-wide rate limiting (OWASP: protect against brute force /
    // resource exhaustion) in addition to the OTP-specific per-mobile/per-IP
    // limits enforced inside AuthService.
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.get<number>("throttle.ttlMs")!,
            limit: config.get<number>("throttle.limit")!,
          },
        ],
      }),
    }),

    PassportModule.register({ defaultStrategy: "jwt" }),

    AuthModule,
    UsersModule,
    RedisModule,
    EventsModule,
    RestaurantModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    JwtStrategy,

    // Secure by default: every route requires a valid JWT unless marked
    // @Public(). Registered before the throttler guard so unauthenticated
    // spam is still rate-limited even though it gets rejected either way.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },

    // Every unhandled error is normalized to the standard error envelope
    // instead of leaking stack traces / framework default error pages.
    { provide: APP_FILTER, useClass: AllExceptionsFilter },

    // Every successful response is wrapped in the standard success envelope.
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextMiddleware).forRoutes("*");
  }
}
