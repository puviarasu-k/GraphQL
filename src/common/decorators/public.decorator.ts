import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "isPublic";

/**
 * Marks a route (or entire controller) as exempt from the global JWT auth
 * guard, e.g. login/OTP endpoints, health checks.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
