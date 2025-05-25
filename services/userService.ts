import { UserRepository } from "../repositories/userRepository";
import { UserModel } from "../models/userModel";
import { FilterQuery } from "mongoose";

// *Purpose: This service class is responsible for handling the business logic of the user entity. It interacts with the user repository to perform CRUD operations on the user entity.
export class UserService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  async getUser(id: string): Promise<UserModel | null> {
    const user = await this.userRepository.getUser(id);
    if (!user) {
      const error = new Error("User not found") as any;
      error.statusCode = 404;
      error.code = 'USER_NOT_FOUND';
      throw error;
    }
    return user;
  }

  async getUsers(): Promise<UserModel[]> {
    try {
      return await this.userRepository.getUsers();
    } catch (error) {
      const err = new Error("Failed to fetch users") as any;
      err.statusCode = 500;
      err.code = 'USERS_FETCH_ERROR';
      throw err;
    }
  }

  async createUser(userData: Partial<UserModel>): Promise<UserModel> {
    try {
      // Validate required fields
      if (!userData.email || !userData.password) {
        const error = new Error("Email and password are required") as any;
        error.statusCode = 400;
        error.code = 'MISSING_REQUIRED_FIELDS';
        throw error;
      }

      // Check if user already exists
      const existingUser = await this.userRepository.searchAndUpdate({ email: userData.email });
      if (existingUser) {
        const error = new Error("User already exists") as any;
        error.statusCode = 400;
        error.code = 'USER_ALREADY_EXISTS';
        throw error;
      }

      return await this.userRepository.createUser(userData);
    } catch (error: any) {
      if (error.statusCode) throw error;

      const err = new Error("Failed to create user") as any;
      err.statusCode = 500;
      err.code = 'USER_CREATE_ERROR';
      throw err;
    }
  }

  async updateUser(updateData: Partial<UserModel>): Promise<UserModel | null> {
    try {
      if (!updateData._id) {
        const error = new Error("User ID is required") as any;
        error.statusCode = 400;
        error.code = 'MISSING_USER_ID';
        throw error;
      }

      const user = await this.userRepository.updateUser(updateData._id, updateData);
      if (!user) {
        const error = new Error("User not found") as any;
        error.statusCode = 404;
        error.code = 'USER_NOT_FOUND';
        throw error;
      }
      return user;
    } catch (error: any) {
      if (error.statusCode) throw error;

      const err = new Error("Failed to update user") as any;
      err.statusCode = 500;
      err.code = 'USER_UPDATE_ERROR';
      throw err;
    }
  }

  async deleteUser(id: string): Promise<UserModel | null> {
    try {
      const user = await this.userRepository.deleteUser(id);
      if (!user) {
        const error = new Error("User not found") as any;
        error.statusCode = 404;
        error.code = 'USER_NOT_FOUND';
        throw error;
      }
      return user;
    } catch (error: any) {
      if (error.statusCode) throw error;

      const err = new Error("Failed to delete user") as any;
      err.statusCode = 500;
      err.code = 'USER_DELETE_ERROR';
      throw err;
    }
  }

  async searchUser(query: FilterQuery<UserModel>): Promise<UserModel | null> {
    try {
      const user = await this.userRepository.searchUser(query);
      if (!user) {
        const error = new Error("User not found") as any;
        error.statusCode = 404;
        error.code = 'USER_NOT_FOUND';
        throw error;
      }
      return user;
    } catch (error: any) {
      if (error.statusCode) throw error;

      const err = new Error("Failed to search user") as any;
      err.statusCode = 500;
      err.code = 'USER_SEARCH_ERROR';
      throw err;
    }
  }
}
