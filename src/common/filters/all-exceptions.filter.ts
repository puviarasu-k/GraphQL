import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";
import { QueryFailedError } from "typeorm";
import { ApiErrorResponseDto } from "../dto/api-response.dto";
import { getRequestId } from "../logger/request-context";

/**
 * Catches everything (Catch() with no args) so no error path ever leaks an
 * unformatted stack trace or framework-default HTML error page to a client.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger("ExceptionFilter");

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { statusCode, error, message } = this.resolve(exception);

    const body = new ApiErrorResponseDto({
      statusCode,
      error,
      message,
      timestamp: new Date().toISOString(),
      path: request.originalUrl,
      requestId: getRequestId(),
    });

    if (Number(statusCode) >= Number(HttpStatus.INTERNAL_SERVER_ERROR)) {
      this.logger.error(
        exception instanceof Error
          ? exception
          : new Error(JSON.stringify(exception)),
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(
        `${request.method} ${request.originalUrl} -> ${statusCode}: ${JSON.stringify(message)}`,
      );
    }

    response.status(statusCode).json(body);
  }

  private resolve(exception: unknown): {
    statusCode: number;
    error: string;
    message: string | string[];
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === "string") {
        return { statusCode: status, error: exception.name, message: res };
      }

      const resObj = res as Record<string, unknown>;
      return {
        statusCode: status,
        error: (resObj.error as string) || exception.name,
        message: (resObj.message as string | string[]) ?? exception.message,
      };
    }

    // Never surface raw DB errors (schema, constraint names, SQL) to clients.
    if (exception instanceof QueryFailedError) {
      return {
        statusCode: HttpStatus.CONFLICT,
        error: "ConflictException",
        message: "The request could not be completed due to a data conflict.",
      };
    }

    // Unknown/unhandled: never leak internals in the response body.
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: "InternalServerError",
      message: "An unexpected error occurred. Please try again later.",
    };
  }
}
