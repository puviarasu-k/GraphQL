import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { UsersModule } from "../users/users.module";
import { RedisModule } from "../redis/redis.module";

@Module({
  imports: [
    UsersModule,
    RedisModule,
    // Registered with the access-token secret as the module default; refresh
    // tokens are signed/verified with an explicit `secret` override per call
    // in AuthService since they use a separate secret and TTL.
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>("jwt.accessSecret"),
        signOptions: {
          expiresIn: config.get<number>("jwt.accessExpiresInSeconds"),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
