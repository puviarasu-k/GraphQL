import { SetMetadata } from "@nestjs/common";
import { Role } from "../../users/enums/role.enum";

export const ROLES_KEY = "roles";

/**
 * Restricts a route to the given role(s). Must be combined with the global
 * JwtAuthGuard (which runs first and populates request.user) plus RolesGuard.
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
