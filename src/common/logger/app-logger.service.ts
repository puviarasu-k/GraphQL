import { ConsoleLogger, Injectable, LogLevel } from "@nestjs/common";
import { getRequestId } from "./request-context";

/**
 * Structured (JSON, one line per event) logger so log lines are directly
 * ingestible by aggregators like CloudWatch, ELK, Datadog, etc, and are
 * greppable/filterable by field instead of free text.
 */
@Injectable()
export class AppLogger extends ConsoleLogger {
  private write(
    level: LogLevel,
    message: unknown,
    context?: string,
    extra?: Record<string, unknown>,
  ) {
    const entry = {
      level,
      timestamp: new Date().toISOString(),
      context: context ?? this.context,
      requestId: getRequestId(),
      message: message instanceof Error ? message.message : message,
      ...(message instanceof Error && message.stack
        ? { stack: message.stack }
        : {}),
      ...extra,
    };
    const line = JSON.stringify(entry);
    if (level === "error") {
      process.stderr.write(line + "\n");
    } else {
      process.stdout.write(line + "\n");
    }
  }

  log(message: unknown, context?: string) {
    this.write("log", message, context);
  }

  error(message: unknown, stack?: string, context?: string) {
    this.write("error", message, context, stack ? { stack } : undefined);
  }

  warn(message: unknown, context?: string) {
    this.write("warn", message, context);
  }

  debug(message: unknown, context?: string) {
    this.write("debug", message, context);
  }

  verbose(message: unknown, context?: string) {
    this.write("verbose", message, context);
  }
}
