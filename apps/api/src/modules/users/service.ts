import { usersRepository } from "./repository.js";
import type { UserPreferences, ThemePreference, DisplayDensity } from "@watchlist/contracts";

export class UsersService {
  public async getUserProfile(userId: string) {
    return usersRepository.getUserById(userId);
  }

  public async getPreferences(userId: string): Promise<UserPreferences> {
    return usersRepository.getPreferences(userId);
  }

  public async updatePreferences(
    userId: string,
    updates: {
      theme?: ThemePreference;
      defaultWatchlistId?: string | null;
      displayDensity?: DisplayDensity;
    }
  ): Promise<UserPreferences> {
    return usersRepository.updatePreferences(userId, updates);
  }
}

export const usersService = new UsersService();
