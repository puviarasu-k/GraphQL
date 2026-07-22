import { Role } from "../enums/role.enum";
import { User } from "../entities/user.entity";

/**
 * What gets sent to clients. There's no password field on this entity today,
 * but keeping an explicit allowlist (rather than returning the raw entity)
 * means any sensitive column added later isn't automatically leaked.
 */
export class UserResponseDto {
  id: number;
  name?: string;
  mobile: string;
  role: Role;
  isActive: boolean;
  createdAt: Date;

  private constructor(user: User) {
    this.id = user.id;
    this.name = user.name;
    this.mobile = user.mobile;
    this.role = user.role;
    this.isActive = user.isActive;
    this.createdAt = user.createdAt;
  }

  static fromEntity(user: User): UserResponseDto {
    return new UserResponseDto(user);
  }
}
