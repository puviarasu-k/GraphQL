import { SetMetadata } from "@nestjs/common";
import { RESPONSE_MESSAGE_KEY } from "../interceptors/response.interceptor";

/**
 * Overrides the default per-verb success message on the standard response
 * envelope, e.g. @ResponseMessage('OTP sent successfully')
 */
export const ResponseMessage = (message: string) =>
  SetMetadata(RESPONSE_MESSAGE_KEY, message);
