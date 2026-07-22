import { Controller, Get, Version, VERSION_NEUTRAL } from "@nestjs/common";
import { AppService } from "./app.service";
import { Public } from "./common/decorators/public.decorator";

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // Simple liveness/health check; must be reachable without a token, prefix,
  // or version segment (excluded from the global prefix in main.ts too).
  @Public()
  @Version(VERSION_NEUTRAL)
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
