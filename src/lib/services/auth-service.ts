// ============================================================
// AuthService — Business logic for authentication
// Service layer pattern with repository abstraction
// ============================================================

import { userRepository } from "@/lib/repositories/user-repository";
import type { User } from "@/lib/types";

export class AuthService {
  async login(email: string, password: string): Promise<User> {
    const user = await userRepository.findByEmail(email);
    if (!user) throw new Error("Invalid email or password");
    if (user.password !== password) throw new Error("Invalid email or password");
    const { password: _, ...safeUser } = user;
    return safeUser as User;
  }

  async register(email: string, password: string, name: string): Promise<User> {
    const existing = await userRepository.findByEmail(email);
    if (existing) throw new Error("Email already registered");
    if (password.length < 6) throw new Error("Password must be at least 6 characters");
    const user = await userRepository.create(email, password, name);
    return user;
  }

  async getUser(userId: string): Promise<User | null> {
    return userRepository.findById(userId);
  }
}

export const authService = new AuthService();
