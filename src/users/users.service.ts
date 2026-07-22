import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { QueryFailedError, Repository } from "typeorm";
import { User } from "./entities/user.entity";

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async findByMobile(mobile: string): Promise<User | null> {
    return this.usersRepository.findOneBy({ mobile });
  }

  async findById(id: number): Promise<User> {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException("User not found");
    }
    return user;
  }

  async updateById(id: number, updates: Partial<User>): Promise<User> {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException("User not found");
    }
    Object.assign(user, updates);
    return await this.usersRepository.save(user);
  }

  /**
   * Used by the OTP verification flow: OTP login previously never touched
   * the users table at all, so a successful OTP check had no associated
   * account and no stable user id to put in a JWT. This finds the existing
   * account for a mobile number or creates one.
   *
   * The mobile column has a unique index, so a race between two concurrent
   * verifications for the same brand-new number is resolved by catching the
   * duplicate-key error and re-reading the row the other request inserted,
   * rather than allowing a 500 or a duplicate account.
   */
  async findOrCreateByMobile(mobile: string): Promise<User> {
    try {
      const existing = await this.findByMobile(mobile);
      if (existing) {
        return existing;
      }
      const created = this.usersRepository.create({ mobile });
      return await this.usersRepository.save(created);
    } catch (err) {
      if (err instanceof QueryFailedError) {
        const raceWinner = await this.findByMobile(mobile);
        if (raceWinner) {
          return raceWinner;
        }
      }
      throw err;
    }
  }
}
