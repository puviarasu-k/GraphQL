import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { EventsGateway } from "./events.gateway";
import { WsJwtGuard } from "../common/guards/ws-jwt.guard";

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>("jwt.accessSecret"),
      }),
    }),
  ],
  providers: [EventsGateway, WsJwtGuard],
  exports: [EventsGateway],
})
export class EventsModule {}
