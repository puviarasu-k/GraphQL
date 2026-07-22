import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { NotFoundException } from "@nestjs/common";
import { Repository } from "typeorm";
import { UsersService } from "./users.service";
import { User } from "./entities/user.entity";
import { Role } from "./enums/role.enum";

type MockRepo = Partial<Record<keyof Repository<User>, jest.Mock>>;

const createMockRepo = (): MockRepo => ({
  findOneBy: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
});

describe("UsersService", () => {
  let service: UsersService;
  let repo: MockRepo;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: createMockRepo() },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repo = module.get(getRepositoryToken(User));
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("findByMobile", () => {
    it("returns the user when found", async () => {
      const user = { id: 1, mobile: "9999999999" } as User;
      (repo.findOneBy as jest.Mock).mockResolvedValue(user);

      await expect(service.findByMobile("9999999999")).resolves.toEqual(user);
      expect(repo.findOneBy).toHaveBeenCalledWith({ mobile: "9999999999" });
    });
  });

  describe("findById", () => {
    it("throws NotFoundException when no user exists", async () => {
      (repo.findOneBy as jest.Mock).mockResolvedValue(null);
      await expect(service.findById(1)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe("findOrCreateByMobile", () => {
    it("returns the existing user without creating one", async () => {
      const user = { id: 1, mobile: "9999999999", role: Role.USER } as User;
      (repo.findOneBy as jest.Mock).mockResolvedValue(user);

      const result = await service.findOrCreateByMobile("9999999999");

      expect(result).toEqual(user);
      expect(repo.create).not.toHaveBeenCalled();
    });

    it("creates a new user when none exists", async () => {
      (repo.findOneBy as jest.Mock).mockResolvedValue(null);
      const created = { mobile: "9999999999" } as User;
      const saved = { id: 2, mobile: "9999999999", role: Role.USER } as User;
      (repo.create as jest.Mock).mockReturnValue(created);
      (repo.save as jest.Mock).mockResolvedValue(saved);

      const result = await service.findOrCreateByMobile("9999999999");

      expect(repo.create).toHaveBeenCalledWith({ mobile: "9999999999" });
      expect(result).toEqual(saved);
    });
  });
});
