import {
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  MaxLength,
} from "class-validator";

// Security-critical Redis key namespaces used internally by the auth flow
// (OTP sessions, rate limits, lockouts). These must never be writable or
// deletable through the generic admin key-value API below — doing so would
// let an admin-token holder (or anyone who steals one) erase lockouts,
// forge OTP sessions, or reset rate limits.
export const RESERVED_KEY_PREFIXES = [
  "ratelimit:",
  "lockout:",
  "failed:",
  "refresh:",
];

export function isReservedKey(key: string): boolean {
  return RESERVED_KEY_PREFIXES.some((prefix) => key.startsWith(prefix));
}

export class RedisSetDto {
  @IsString()
  @MaxLength(200)
  @Matches(/^[a-zA-Z0-9:_-]+$/, {
    message:
      "key may only contain letters, numbers, colons, underscores and hyphens",
  })
  key!: string;

  @IsString()
  @MaxLength(65536)
  value!: string;

  @IsOptional()
  @IsPositive()
  ttl?: number;
}
