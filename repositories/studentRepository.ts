import { Student, StudentModel } from "../models/studentModel";
import { FilterQuery, UpdateQuery } from "mongoose";
import { AppError } from "../middleware/errorHandler";
import { Types } from "mongoose";

// Purpose: This file is responsible for handling all the database operations related to the Student model.
export class StudentRepository {
  // This method returns a Student in the database that matches the id.
  async getStudent(id: string): Promise<StudentModel | null> {
    return Student.findById(id);
  }

  // This method returns all the Student in the database.
  async getStudents(): Promise<StudentModel[]> {
    return Student.find();
  }

  // This method creates a bew Student in the database.
  async createStudent(StudentData: Partial<StudentModel>): Promise<StudentModel> {
    return Student.create(StudentData);
  }

  // This method updates a Student in the database.
  async updateStudent(
    id: string,
    StudentData: Partial<StudentModel>
  ): Promise<StudentModel | null> {
    return Student.findByIdAndUpdate(id, StudentData, { new: true });
  }

  // This method deletes a Student from the database.
  async deleteStudent(id: string): Promise<StudentModel | null> {
    return Student.findByIdAndDelete(id);
  }

  // This method searches for a Student in the database that matches the query object.
  async searchStudent(query: FilterQuery<StudentModel>): Promise<StudentModel | null> {
    return Student.findOne(query);
  }

  async searchAndUpdate(
    query: FilterQuery<StudentModel>,
    update?: UpdateQuery<StudentModel>,
    options?: { multi?: boolean }
  ): Promise<StudentModel | null | { modifiedCount: number }> {
    // If update is not provided, it simply searches for a Student in the database. It returns the Student if found, or null if not.
    if (!update) {
      return Student.findOne(query);
    }

    // If update is provided, it checks if the multi option is specified in the options object. If multi is true, it updated all Students in the database that match the query with the update. It returns an object with the modifiedCount property, which indicated the number of documents that were modified.
    if (options?.multi) {
      const result = await Student.updateMany(query, update);
      return { modifiedCount: result.modifiedCount };
    }

    // If multi is not specified or is false, it updates the first Student in the database that matches the query with the update. It returns the updated Student.
    return Student.findOneAndUpdate(query, update, { new: true });
  }

  /**
   * Find Student by ID
   * @param id - Student ID
   */
  async findById(id: string | Types.ObjectId): Promise<StudentModel | null> {
    try {
      return await Student.findById(id);
    } catch (error) {
      throw new AppError("Failed to find Student", 500);
    }
  }
}
