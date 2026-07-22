import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { Role } from "../../users/enums/role.enum";

export interface JwtAccessPayload {
  sub: number;
  mobile: string;
  role: Role;
  jti: string;
  type: "access";
}

export interface AuthenticatedUser {
  id: number;
  mobile: string;
  role: Role;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>("jwt.accessSecret")!,
    });
  }

  // Runs only after the signature and expiry have already been verified by
  // passport-jwt, so this is safe to trust.
  validate(payload: JwtAccessPayload): AuthenticatedUser {
    if (payload.type !== "access") {
      throw new UnauthorizedException("Invalid token type");
    }
    return { id: payload.sub, mobile: payload.mobile, role: payload.role };
  }
}
