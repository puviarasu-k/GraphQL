import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { Socket } from "socket.io";
import {
  JwtAccessPayload,
  AuthenticatedUser,
} from "../strategies/jwt.strategy";

@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const client = context.switchToWs().getClient<Socket>();
    try {
      const user = this.verifyClient(client);
      (client.data as Record<string, unknown>).user = user;
      return true;
    } catch (err) {
      this.logger.warn(
        `WS auth rejected for ${client.id}: ${(err as Error).message}`,
      );
      throw new UnauthorizedException("Invalid or expired token");
    }
  }

  /**
   * Extracts and verifies the JWT for a socket, either from the recommended
   * `handshake.auth.token` (socket.io v3+ auth payload, never logged/cached
   * the way query strings can be) or, as a fallback, an `Authorization`
   * header for clients that set one during the handshake.
   */
  verifyClient(client: Socket): AuthenticatedUser {
    const token =
      (client.handshake.auth?.token as string | undefined) ||
      this.extractFromAuthHeader(client);

    if (!token) {
      throw new Error("Missing token");
    }

    const payload = this.jwtService.verify<JwtAccessPayload>(token, {
      secret: this.configService.get<string>("jwt.accessSecret"),
    });

    if (payload.type !== "access") {
      throw new Error("Invalid token type");
    }

    return { id: payload.sub, mobile: payload.mobile, role: payload.role };
  }

  private extractFromAuthHeader(client: Socket): string | undefined {
    const header = client.handshake.headers?.authorization;
    if (header?.startsWith("Bearer ")) {
      return header.slice(7);
    }
    return undefined;
  }
}
