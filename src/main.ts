import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { RequestMethod, ValidationPipe, VersioningType } from "@nestjs/common";
import type { Express } from "express";
import helmet from "helmet";
import compression from "compression";
import { AppModule } from "./app.module";
import { AppLogger } from "./common/logger/app-logger.service";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // Buffer logs until our structured logger is attached below, so nothing
    // from the bootstrap phase is lost or printed in Nest's default format.
    bufferLogs: true,
  });

  const logger = new AppLogger();
  app.useLogger(logger);

  const configService = app.get(ConfigService);

  // --- OWASP / security hardening -----------------------------------
  // Sets a solid baseline of security headers (X-Content-Type-Options,
  // X-Frame-Options, HSTS, restrictive default CSP, removes X-Powered-By...).
  app.use(helmet());
  app.use(compression());

  // Explicit CORS allowlist rather than reflecting/allowing '*', which would
  // let any origin make authenticated cross-site requests.
  app.enableCors({
    origin: configService.get<string[]>("cors.origins"),
    credentials: true,
  });

  // If the app runs behind a reverse proxy/load balancer, this is required
  // for `@Ip()`/`req.ip` (used for OTP rate limiting) to reflect the real
  // client IP from X-Forwarded-For rather than the proxy's own address.
  if (configService.get<string>("env") === "production") {
    const expressApp = app.getHttpAdapter().getInstance() as Express;
    expressApp.set("trust proxy", 1);
  }

  app.setGlobalPrefix(configService.get<string>("globalPrefix")!, {
    exclude: [{ path: "/", method: RequestMethod.GET }],
  });
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: "1" });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip unknown properties (mass-assignment defense)
      forbidNonWhitelisted: true, // reject requests containing unknown fields
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Let ongoing requests/DB connections/Redis connections drain cleanly on
  // SIGTERM/SIGINT instead of being killed mid-flight (relies on the
  // onModuleDestroy hooks already implemented, e.g. RedisService).
  app.enableShutdownHooks();

  const port = configService.get<number>("port")!;
  await app.listen(port, "0.0.0.0");
  logger.log(`Application listening on port ${port}`, "Bootstrap");
}

bootstrap().catch((err) => {
  console.error("Fatal error during bootstrap", err);
  process.exit(1);
});
