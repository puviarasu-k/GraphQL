import { Restaurant } from "../entities/restaurants.entity";

/**
 * What the customer-facing app is allowed to see about a restaurant.
 * Deliberately excludes `owner` (the SELLER account) and anything else
 * that isn't meant to leave the backend for a USER-role caller — mapping
 * explicitly here means adding a field to the entity later can't
 * accidentally leak it, the way returning the raw entity would.
 */
export class RestaurantResponseDto {
  id!: number;
  name!: string;
  logoUrl?: string;

  static fromEntity(restaurant: Restaurant): RestaurantResponseDto {
    const dto = new RestaurantResponseDto();
    dto.id = restaurant.id;
    dto.name = restaurant.name;
    dto.logoUrl = restaurant.logoUrl;
    return dto;
  }
}
