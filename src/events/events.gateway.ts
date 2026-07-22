import { Logger, UseGuards } from "@nestjs/common";
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { WsJwtGuard } from "../common/guards/ws-jwt.guard";
import { AuthenticatedUser } from "../common/strategies/jwt.strategy";

@WebSocketGateway({
  cors: {
    // Mirrors the HTTP CORS allowlist; configured via CORS_ORIGINS env var
    // in EventsGateway construction below rather than hardcoded '*'.
    origin: (process.env.CORS_ORIGINS || "http://localhost:3000")
      .split(",")
      .map((o) => o.trim()),
    credentials: true,
  },
  namespace: "/events",
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(EventsGateway.name);

  constructor(private readonly wsJwtGuard: WsJwtGuard) {}

  /**
   * Socket.io connections happen before any Nest guard runs, so the token is
   * verified explicitly here; unauthenticated sockets are disconnected
   * immediately rather than allowed to linger and probe message handlers.
   */
  handleConnection(client: Socket) {
    try {
      const user = this.wsJwtGuard.verifyClient(client);
      (client.data as Record<string, unknown>).user = user;
      void client.join(`user:${user.id}`);
      this.logger.log(`Client ${client.id} authenticated as user ${user.id}`);
    } catch {
      client.emit("error", { message: "Unauthorized" });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client ${client.id} disconnected`);
  }

  // Defense in depth: even though handleConnection already authenticates,
  // individual message handlers re-check via the guard in case a socket
  // library upgrade ever changes connection-time semantics.
  @UseGuards(WsJwtGuard)
  @SubscribeMessage("queue:subscribe")
  handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { queueName: string },
  ) {
    const user = (client.data as Record<string, unknown>)
      .user as AuthenticatedUser;
    void client.join(`queue:${data.queueName}`);
    return {
      event: "queue:subscribed",
      data: { queueName: data.queueName, userId: user.id },
    };
  }

  /** Called by other services (e.g. a queue processor) to push updates. */
  emitQueueUpdate(queueName: string, payload: unknown) {
    this.server.to(`queue:${queueName}`).emit("queue:update", payload);
  }
}
