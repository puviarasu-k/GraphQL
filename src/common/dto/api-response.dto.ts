/**
 * Standard success envelope. Every 2xx JSON response from the API is shaped
 * like this so clients can rely on one contract instead of per-endpoint
 * guessing.
 */
export class ApiResponseDto<T> {
  success: true;
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
  path: string;
  requestId?: string;

  constructor(partial: Omit<ApiResponseDto<T>, "success">) {
    this.success = true;
    this.statusCode = partial.statusCode;
    this.message = partial.message;
    this.data = partial.data;
    this.timestamp = partial.timestamp;
    this.path = partial.path;
    this.requestId = partial.requestId;
  }
}

/**
 * Standard error envelope. Thrown exceptions (validation errors, HttpExceptions,
 * and unhandled errors) are all normalized into this shape by the global
 * exception filter.
 */
export class ApiErrorResponseDto {
  success: false;
  statusCode: number;
  error: string;
  message: string | string[];
  timestamp: string;
  path: string;
  requestId?: string;

  constructor(partial: Omit<ApiErrorResponseDto, "success">) {
    this.success = false;
    this.statusCode = partial.statusCode;
    this.error = partial.error;
    this.message = partial.message;
    this.timestamp = partial.timestamp;
    this.path = partial.path;
    this.requestId = partial.requestId;
  }
}
