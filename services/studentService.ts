import { StudentRepository } from "../repositories/studentRepository";
import { StudentModel } from "../models/studentModel";
import { FilterQuery } from "mongoose";
import { CSVExportHelper } from "../helpers/csvExport";

// *Purpose: This service class is responsible for handling the business logic of the student entity. It interacts with the student repository to perform CRUD operations on the student entity.
export class StudentService {
  private studentRepository: StudentRepository;

  constructor() {
    this.studentRepository = new StudentRepository();
  }

  async getStudent(id: string): Promise<StudentModel | null> {
    const student = await this.studentRepository.getStudent(id);
    if (!student) {
      const error = new Error("Student not found") as any;
      error.statusCode = 404;
      error.code = "USER_NOT_FOUND";
      throw error;
    }
    return student;
  }

  async getStudents(): Promise<StudentModel[]> {
    try {
      return await this.studentRepository.getStudents();
    } catch (error) {
      const err = new Error("Failed to fetch students") as any;
      err.statusCode = 500;
      err.code = "STUDENTS_FETCH_ERROR";
      throw err;
    }
  }

  async createStudent(studentData: Partial<StudentModel>): Promise<StudentModel> {
    try {
      // Validate required fields
      if (!studentData.email || !studentData.firstName) {
        const error = new Error("Email and other fields are required") as any;
        error.statusCode = 400;
        error.code = "MISSING_REQUIRED_FIELDS";
        throw error;
      }

      // Check if student already exists
      const existingStudent = await this.studentRepository.searchAndUpdate({
        email: studentData.email,
      });
      if (existingStudent) {
        const error = new Error("Student already exists") as any;
        error.statusCode = 400;
        error.code = "STUDENT_ALREADY_EXISTS";
        throw error;
      }

      return await this.studentRepository.createStudent(studentData);
    } catch (error: any) {
      if (error.statusCode) throw error;

      const err = new Error("Failed to create student") as any;
      err.statusCode = 500;
      err.code = "STUDENT_CREATE_ERROR";
      throw err;
    }
  }

  async updateStudent(updateData: Partial<StudentModel>): Promise<StudentModel | null> {
    try {
      if (!updateData._id) {
        const error = new Error("Student ID is required") as any;
        error.statusCode = 400;
        error.code = "MISSING_STUDENT_ID";
        throw error;
      }

      const student = await this.studentRepository.updateStudent(updateData._id, updateData);
      if (!student) {
        const error = new Error("Student not found") as any;
        error.statusCode = 404;
        error.code = "STUDENT_NOT_FOUND";
        throw error;
      }
      return student;
    } catch (error: any) {
      if (error.statusCode) throw error;

      const err = new Error("Failed to update student") as any;
      err.statusCode = 500;
      err.code = "STUDENT_UPDATE_ERROR";
      throw err;
    }
  }

  async deleteStudent(id: string): Promise<StudentModel | null> {
    try {
      const student = await this.studentRepository.deleteStudent(id);
      if (!student) {
        const error = new Error("Student not found") as any;
        error.statusCode = 404;
        error.code = "STUDENT_NOT_FOUND";
        throw error;
      }
      return student;
    } catch (error: any) {
      if (error.statusCode) throw error;

      const err = new Error("Failed to delete student") as any;
      err.statusCode = 500;
      err.code = "STUDENT_DELETE_ERROR";
      throw err;
    }
  }

  async searchStudent(query: FilterQuery<StudentModel>): Promise<StudentModel | null> {
    try {
      const student = await this.studentRepository.searchStudent(query);
      if (!student) {
        const error = new Error("Student not found") as any;
        error.statusCode = 404;
        error.code = "STUDENT_NOT_FOUND";
        throw error;
      }
      return student;
    } catch (error: any) {
      if (error.statusCode) throw error;

      const err = new Error("Failed to search student") as any;
      err.statusCode = 500;
      err.code = "STUDENT_SEARCH_ERROR";
      throw err;
    }
  }

  async exportStudentsToCSV(): Promise<{ csvData: string; filename: string }> {
    try {
      const students = await this.studentRepository.getStudents();
      const csvData = CSVExportHelper.exportStudentsToCSV(students);
      const filename = CSVExportHelper.generateCSVFilename("students");

      return {
        csvData,
        filename,
      };
    } catch (error: any) {
      if (error.statusCode) throw error;

      const err = new Error("Failed to export students to CSV") as any;
      err.statusCode = 500;
      err.code = "STUDENT_CSV_EXPORT_ERROR";
      throw err;
    }
  }
}
