import { Injectable, Logger, NestMiddleware } from "@nestjs/common";
import { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { requestContextStorage } from "../logger/request-context";

const REQUEST_ID_HEADER = "x-request-id";

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger("HTTP");

  use(req: Request, res: Response, next: NextFunction) {
    // Trust an inbound request id from a gateway/load balancer if present,
    // otherwise mint a fresh one, so requests are traceable end to end.
    const requestId =
      (req.headers[REQUEST_ID_HEADER] as string) || randomUUID();
    res.setHeader(REQUEST_ID_HEADER, requestId);

    requestContextStorage.run({ requestId, ip: req.ip }, () => {
      const start = process.hrtime.bigint();

      res.on("finish", () => {
        const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
        this.logger.log(
          JSON.stringify({
            method: req.method,
            path: req.originalUrl,
            statusCode: res.statusCode,
            durationMs: Math.round(durationMs),
            ip: req.ip,
          }),
        );
      });

      next();
    });
  }
}
