import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { UserService } from "./userService";
import { UserModel } from "../models/userModel";

export class AuthService {
  private userService: UserService;
  private readonly JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
  private readonly JWT_EXPIRES_IN = "24h";

  constructor() {
    this.userService = new UserService();
  }

  /**
   * Hash password
   */
  private async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  /**
   * Compare password with hash
   */
  private async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate JWT token
   */
  private generateToken(user: UserModel): string {
    return jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role,
      },
      this.JWT_SECRET,
      { expiresIn: this.JWT_EXPIRES_IN }
    );
  }

  /**
   * Register new user
   */
  async register(userData: Partial<UserModel>): Promise<{ user: UserModel; token: string }> {
    if (!userData.password) {
      throw new Error("Password is required");
    }

    // Hash password
    userData.password = await this.hashPassword(userData.password);

    // Create user
    const user = await this.userService.createUser(userData);

    // Generate token
    const token = this.generateToken(user);

    return { user, token };
  }

  /**
   * Login user
   */
  async login(email: string, password: string, role?: string): Promise<{ user: Partial<UserModel>; token: string }> {
    // Find user
    const user = await this.userService.searchUser({ email });
    if (!user) {
      const error = new Error("Invalid credentials") as any;
      error.statusCode = 401;
      error.code = "INVALID_CREDENTIALS";
      throw error;
    }

    // Verify password
    const isValidPassword = await this.comparePassword(password, user.password);
    if (!isValidPassword) {
      const error = new Error("Invalid credentials") as any;
      error.statusCode = 401;
      error.code = "INVALID_CREDENTIALS";
      throw error;
    }

    // Verify role if provided
    if (role && user.role !== role) {
      const error = new Error(`Access denied. User is not a ${role}`) as any;
      error.statusCode = 403;
      error.code = "INVALID_ROLE";
      throw error;
    }

    // Generate token with Bearer prefix
    const token = this.generateToken(user);

    // Return user without password and include token
    const userWithoutPassword = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      personId: user.personId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return {
      user: userWithoutPassword,
      token,
    };
  }

  /**
   * Verify token
   */
  verifyToken(token: string): any {
    try {
      // Remove Bearer prefix if present
      const tokenString = token.startsWith('Bearer ') ? token.slice(7) : token;
      return jwt.verify(tokenString, this.JWT_SECRET);
    } catch (error) {
      const err = new Error("Invalid token") as any;
      err.statusCode = 401;
      err.code = "INVALID_TOKEN";
      throw err;
    }
  }
}
