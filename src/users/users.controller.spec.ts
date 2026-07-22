import { Test, TestingModule } from "@nestjs/testing";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";
import { Role } from "./enums/role.enum";
import { User } from "./entities/user.entity";

describe("UsersController", () => {
  let controller: UsersController;
  let usersService: { findById: jest.Mock };

  beforeEach(async () => {
    usersService = { findById: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: usersService }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("me", () => {
    it("returns the current user's safe profile", async () => {
      const user: User = {
        id: 1,
        mobile: "9999999999",
        role: Role.USER,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      usersService.findById.mockResolvedValue(user);

      const result = await controller.me({
        id: 1,
        mobile: "9999999999",
        role: Role.USER,
      });

      expect(usersService.findById).toHaveBeenCalledWith(1);
      expect(result.mobile).toBe("9999999999");
    });
  });
});
