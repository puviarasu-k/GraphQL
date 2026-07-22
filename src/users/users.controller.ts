import { Body, Controller, Get, Patch } from "@nestjs/common";
import { UsersService } from "./users.service";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../common/strategies/jwt.strategy";
import { UserResponseDto } from "./dto/user-response.dto";
import { UserDto } from "./dto/user.dto";

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("me")
  async me(@CurrentUser() user: AuthenticatedUser): Promise<UserResponseDto> {
    const fullUser = await this.usersService.findById(user.id);
    return UserResponseDto.fromEntity(fullUser);
  }

  @Patch("me")
  async updateMe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UserDto,
  ): Promise<void> {
    await this.usersService.updateById(user.id, dto);
  }
}
