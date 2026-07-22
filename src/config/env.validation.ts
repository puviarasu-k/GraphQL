import { plainToInstance } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  validateSync,
} from "class-validator";

enum NodeEnv {
  Development = "development",
  Production = "production",
  Test = "test",
}

class EnvironmentVariables {
  @IsOptional()
  @IsIn([NodeEnv.Development, NodeEnv.Production, NodeEnv.Test])
  NODE_ENV?: NodeEnv;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT?: number;

  @IsString()
  DB_HOST!: string;

  @IsString()
  DB_USERNAME!: string;

  @IsString()
  DB_NAME!: string;

  // JWT secrets are the most security-critical values in the app: if they're
  // weak or reused, every issued token is forgeable. Fail fast on boot
  // rather than silently signing tokens with something insecure.
  @IsString()
  @MinLength(32, {
    message: "JWT_ACCESS_SECRET must be at least 32 characters long",
  })
  JWT_ACCESS_SECRET!: string;

  @IsString()
  @MinLength(32, {
    message: "JWT_REFRESH_SECRET must be at least 32 characters long",
  })
  JWT_REFRESH_SECRET!: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const messages = errors
      .map((e) => Object.values(e.constraints ?? {}).join(", "))
      .join("; ");
    throw new Error(`Invalid environment configuration: ${messages}`);
  }

  if (
    validatedConfig.JWT_ACCESS_SECRET &&
    validatedConfig.JWT_REFRESH_SECRET &&
    validatedConfig.JWT_ACCESS_SECRET === validatedConfig.JWT_REFRESH_SECRET
  ) {
    throw new Error(
      "JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different values",
    );
  }

  return validatedConfig;
}
