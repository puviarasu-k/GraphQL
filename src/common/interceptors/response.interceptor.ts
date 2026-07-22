import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request, Response } from "express";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { ApiResponseDto } from "../dto/api-response.dto";
import { getRequestId } from "../logger/request-context";

export const RESPONSE_MESSAGE_KEY = "response_message";

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiResponseDto<T>
> {
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponseDto<T>> {
    const httpCtx = context.switchToHttp();
    const request = httpCtx.getRequest<Request>();
    const response = httpCtx.getResponse<Response>();

    const customMessage = this.reflector.getAllAndOverride<string>(
      RESPONSE_MESSAGE_KEY,
      [context.getHandler(), context.getClass()],
    );

    return next.handle().pipe(
      map((data: T) => {
        return new ApiResponseDto<T>({
          statusCode: response.statusCode,
          message: customMessage ?? this.defaultMessage(request.method),
          data,
          timestamp: new Date().toISOString(),
          path: request.originalUrl,
          requestId: getRequestId(),
        });
      }),
    );
  }

  private defaultMessage(method: string): string {
    switch (method) {
      case "POST":
        return "Created successfully";
      case "PUT":
      case "PATCH":
        return "Updated successfully";
      case "DELETE":
        return "Deleted successfully";
      default:
        return "Request successful";
    }
  }
}
