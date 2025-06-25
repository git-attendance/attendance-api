import Attendance, { AttendanceModel } from "../models/attendanceModel";
import { AppError } from "../middleware/errorHandler";
import { Types, FilterQuery } from "mongoose";

export class AttendanceRepository {
  /**
   * Find the latest attendance record for a user
   * @param studentId - The user's ID
   */
  async findLatestByStudentId(studentId: Types.ObjectId): Promise<AttendanceModel | null> {
    return Attendance.findOne({ studentId }).sort({ createdAt: -1 });
  }

  /**
   * Create a new attendance record
   * @param data - Attendance data
   */
  async create(data: Partial<AttendanceModel>): Promise<AttendanceModel> {
    try {
      return await Attendance.create(data);
    } catch (error) {
      throw new AppError("Failed to create attendance record", 500);
    }
  }

  /**
   * Update an attendance record
   * @param attendance - Attendance record to update
   */
  async update(attendance: AttendanceModel): Promise<AttendanceModel> {
    try {
      const updated = await attendance.save();
      return updated;
    } catch (error) {
      throw new AppError("Failed to update attendance record", 500);
    }
  }

  /**
   * Find latest attendance record by user ID and subject ID
   * @param studentId - Student ID
   * @param subjectId - Subject ID
   */
  async findLatestByStudentAndSubject(
    studentId: Types.ObjectId,
    subjectId: string
  ): Promise<AttendanceModel | null> {
    try {
      return await Attendance.findOne({
        studentId,
        subjectId,
      }).sort({ createdAt: -1 });
    } catch (error) {
      throw new AppError("Failed to find latest attendance record", 500);
    }
  }

  /**
   * Get attendance history
   * @param studentId - Optional student ID for filtering
   * @param subjectId - Optional subject ID for filtering
   * @param startDate - Optional start date for filtering
   * @param endDate - Optional end date for filtering
   */
  async getHistory(
    studentId?: string,
    subjectId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<AttendanceModel[]> {
    try {
      const query: any = {};

      if (studentId) {
        query.studentId = studentId;
      }

      if (subjectId) {
        query.subjectId = subjectId;
      }

      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) {
          query.createdAt.$gte = startDate;
        }
        if (endDate) {
          query.createdAt.$lte = endDate;
        }
      }

      return await Attendance.find(query)
        .sort({ createdAt: -1 })
        .populate("studentId", "firstName lastName email section strand")
        .populate("subjectId", "code name schedule");
    } catch (error) {
      throw new AppError("Failed to fetch attendance history", 500);
    }
  }

  /**
   * Get attendance records for a specific subject
   * @param subjectId - Subject ID
   * @param startDate - Optional start date for filtering
   * @param endDate - Optional end date for filtering
   */
  async getSubjectAttendance(
    subjectId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<AttendanceModel[]> {
    try {
      const query: any = { subjectId };

      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) {
          query.createdAt.$gte = startDate;
        }
        if (endDate) {
          query.createdAt.$lte = endDate;
        }
      }

      return await Attendance.find(query).sort({ createdAt: -1 }).populate("userId", "name");
    } catch (error) {
      throw new AppError("Failed to fetch subject attendance records", 500);
    }
  }

  /**
   * Get attendance history for multiple subjects
   * @param subjectIds - Array of subject IDs
   * @param studentId - Optional student ID for filtering
   * @param startDate - Optional start date for filtering
   * @param endDate - Optional end date for filtering
   */
  async getHistoryBySubjects(
    subjectIds: string[],
    studentId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<AttendanceModel[]> {
    try {
      const query: any = {
        subjectId: { $in: subjectIds },
      };

      if (studentId) {
        query.studentId = studentId;
      }

      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) {
          query.createdAt.$gte = startDate;
        }
        if (endDate) {
          query.createdAt.$lte = endDate;
        }
      }

      return await Attendance.find(query)
        .sort({ createdAt: -1 })
        .populate("studentId", "firstName lastName email section strand")
        .populate("subjectId", "code name schedule");
    } catch (error) {
      throw new AppError("Failed to fetch attendance history", 500);
    }
  }

  /**
   * Find attendance records by filter
   * @param filter - MongoDB filter object
   */
  async findByFilter(filter: any = {}): Promise<AttendanceModel[]> {
    try {
      return await Attendance.find(filter)
        .sort({ createdAt: -1 })
        .populate("studentId", "firstName lastName email section strand")
        .populate("subjectId", "code name schedule");
    } catch (error) {
      throw new AppError("Failed to fetch attendance records", 500);
    }
  }
}
