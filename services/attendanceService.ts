import mongoose from "mongoose";
import { AttendanceModel } from "../models/attendanceModel";
import AttendanceSchema from "../models/attendanceModel";
import { Student } from "../models/studentModel";
import { Subject } from "../models/subjectModel";
import { User } from "../models/userModel";
import { AttendanceRepository } from "../repositories/attendanceRepository";
import { FaceRecognitionService } from "./faceRecognitionService";
import { SMSService } from "./smsService";
import { CSVExportHelper } from "../helpers/csvExport";

export class AttendanceService {
  private faceRecognitionService: FaceRecognitionService;
  private attendanceRepository: AttendanceRepository;
  private smsService: SMSService;

  constructor() {
    this.faceRecognitionService = new FaceRecognitionService();
    this.attendanceRepository = new AttendanceRepository();
    this.smsService = new SMSService();
  }

  /**
   * Verify if a user has access to a subject
   * @param userId - ID of the user
   * @param subjectId - ID of the subject
   * @returns boolean indicating if user has access
   */
  private async verifyUserSubjectAccess(userId: string, subjectId: string): Promise<boolean> {
    // First check if user is admin
    const user = await User.findById(userId);
    if (!user) return false;

    if (user.role === "admin") return true;

    // If not admin, check if teacher has access to subject
    const subject = await Subject.findById(subjectId);
    if (!subject) return false;

    return subject.instructor.toString() === userId;
  }

  /**
   * Process attendance using face recognition for a specific subject
   * @param photoBuffer - Buffer of the photo to verify
   * @param subjectId - ID of the subject for attendance
   * @param filename - Original filename of the uploaded photo
   */
  async processAttendance(
    photoBuffer: Buffer,
    subjectId: string,
    filename: string
  ): Promise<AttendanceModel> {
    // First, verify if the subject exists
    const subject = await Subject.findById(subjectId);
    if (!subject) {
      const error = new Error("Subject not found") as any;
      error.statusCode = 404;
      error.code = "SUBJECT_NOT_FOUND";
      throw error;
    }

    // Check current time against subject schedule first
    // Convert to Philippines time (UTC+8)
    const philippinesOffset = 8 * 60; // 8 hours in minutes
    const now = new Date();
    const currentTime = new Date(now.getTime() + philippinesOffset * 60 * 1000);
    const currentDay = currentTime.toLocaleDateString("en-US", { weekday: "long" });

    if (subject.schedule.day !== currentDay) {
      const error = new Error(`No class scheduled for ${currentDay}`) as any;
      error.statusCode = 400;
      error.code = "NO_CLASS_SCHEDULED";
      throw error;
    }

    const currentTimeStr = currentTime.toTimeString().slice(0, 5); // HH:MM format
    if (currentTimeStr < subject.schedule.startTime || currentTimeStr > subject.schedule.endTime) {
      const error = new Error("Attendance can only be marked during class hours") as any;
      error.statusCode = 400;
      error.code = "OUTSIDE_CLASS_HOURS";
      throw error;
    }

    // Use face recognition to identify the student
    const verificationResult = await this.faceRecognitionService.verifyPerson(
      photoBuffer,
      "1",
      filename
    );

    if (!verificationResult.length) {
      const error = new Error("Face not recognized") as any;
      error.statusCode = 400;
      error.code = "FACE_NOT_RECOGNIZED";
      throw error;
    }

    const match = verificationResult[0];
    console.log("Face verification match:", match);

    if (match.confidence < 0.8) {
      const error = new Error("Face verification confidence too low") as any;
      error.statusCode = 400;
      error.code = "LOW_CONFIDENCE";
      throw error;
    }

    // Find the student using the name from face recognition (which is the student ID)
    const student = await Student.findById(match.name);
    if (!student) {
      const error = new Error("Student not found in database") as any;
      error.statusCode = 404;
      error.code = "STUDENT_NOT_FOUND";
      throw error;
    }

    // Check if student has personId (enrolled face)
    if (!student.personId) {
      const error = new Error("Student has not enrolled their face") as any;
      error.statusCode = 400;
      error.code = "FACE_NOT_ENROLLED";
      throw error;
    }

    console.log("Student identified:", {
      studentId: student._id.toString(),
      firstName: student.firstName,
      lastName: student.lastName,
      personId: student.personId,
    });

    // Get latest attendance record for the student in this subject
    const latestAttendance = await this.attendanceRepository.findLatestByStudentAndSubject(
      student._id,
      subjectId
    );

    try {
      let attendanceRecord: AttendanceModel;

      if (!latestAttendance || latestAttendance.status === "checked-out") {
        // Create check-in record
        attendanceRecord = await this.attendanceRepository.create({
          studentId: student._id,
          subjectId: subject._id,
          personId: student.personId,
          checkInTime: new Date(),
          status: "checked-in",
          attendanceStatus: "present",
          confidence: match.confidence,
        });
      } else {
        // Update existing record with check-out
        latestAttendance.checkOutTime = new Date();
        latestAttendance.status = "checked-out";
        latestAttendance.attendanceStatus = "present";
        attendanceRecord = await this.attendanceRepository.update(latestAttendance);
      }

      // Send SMS notification to guardian
      try {
        await this.smsService.sendAttendanceNotification(
          student,
          subject.name,
          attendanceRecord.status,
          attendanceRecord.status === "checked-in"
            ? attendanceRecord.checkInTime
            : attendanceRecord.checkOutTime!
        );
      } catch (smsError: any) {
        // Log SMS error but don't fail the attendance process
        console.warn("Failed to send SMS notification:", smsError.message);
      }

      // Populate the response with full student and subject data
      const populatedResponse = {
        ...attendanceRecord.toObject(),
        studentId: {
          _id: student._id,
          firstName: student.firstName,
          lastName: student.lastName,
          email: student.email,
          section: student.section,
          strand: student.strand,
          image: student.image,
          personId: student.personId,
        },
        subjectId: {
          _id: subject._id,
          code: subject.code,
          name: subject.name,
          schedule: subject.schedule,
        },
      };

      return populatedResponse as AttendanceModel;
    } catch (error) {
      const err = new Error("Failed to process attendance record") as any;
      err.statusCode = 500;
      err.code = "ATTENDANCE_PROCESSING_ERROR";
      throw err;
    }
  }

  /**
   * Get attendance history for students in teacher's subjects or all students if admin
   * @param subjectId - Optional subject ID for filtering
   * @param startDate - Optional start date for filtering
   * @param endDate - Optional end date for filtering
   * @param userId - ID of the user requesting history
   */
  async getAttendanceHistory(
    subjectId: string | undefined,
    startDate: Date | undefined,
    endDate: Date | undefined,
    userId: string
  ): Promise<AttendanceModel[]> {
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      const error = new Error("User not found") as any;
      error.statusCode = 404;
      error.code = "USER_NOT_FOUND";
      throw error;
    }

    // If admin, allow access to all attendance records
    if (user.role === "admin") {
      return this.attendanceRepository.getHistory(undefined, subjectId, startDate, endDate);
    }

    // For teachers, verify access if specific subject is requested
    if (subjectId) {
      const hasAccess = await this.verifyUserSubjectAccess(userId, subjectId);
      if (!hasAccess) {
        const error = new Error("Not authorized to view attendance for this subject") as any;
        error.statusCode = 403;
        error.code = "UNAUTHORIZED_SUBJECT_ACCESS";
        throw error;
      }
      return this.attendanceRepository.getHistory(undefined, subjectId, startDate, endDate);
    }

    // If no specific subject, get all attendance records for teacher's subjects
    const teacherSubjects = await Subject.find({ instructor: userId }).select("_id");
    const subjectIds = teacherSubjects.map((subject) => subject._id.toString());
    return this.attendanceRepository.getHistoryBySubjects(
      subjectIds,
      undefined,
      startDate,
      endDate
    );
  }

  /**
   * Get attendance statistics for a subject
   * @param subjectId - ID of the subject (optional for admin users)
   * @param startDate - Start date for statistics
   * @param endDate - End date for statistics
   * @param userId - ID of the user requesting stats
   */
  async getSubjectAttendanceStats(
    subjectId: string | undefined,
    startDate: Date | undefined,
    endDate: Date | undefined,
    userId: string
  ) {
    // Check if user exists and get role
    const user = await User.findById(userId);
    if (!user) {
      const error = new Error("User not found") as any;
      error.statusCode = 404;
      error.code = "USER_NOT_FOUND";
      throw error;
    }

    // For teachers, subjectId is required
    if (user.role === "teacher" && !subjectId) {
      const error = new Error("Subject ID is required for teachers") as any;
      error.statusCode = 400;
      error.code = "SUBJECT_ID_REQUIRED";
      throw error;
    }

    // If subjectId is provided, verify access for teachers
    if (subjectId && user.role === "teacher") {
      const hasAccess = await this.verifyUserSubjectAccess(userId, subjectId);
      if (!hasAccess) {
        const error = new Error("Not authorized to view attendance stats for this subject") as any;
        error.statusCode = 403;
        error.code = "UNAUTHORIZED_SUBJECT_ACCESS";
        throw error;
      }
    }

    let attendanceRecords;
    if (subjectId) {
      // Get stats for specific subject
      attendanceRecords = await this.attendanceRepository.getSubjectAttendance(
        subjectId,
        startDate,
        endDate
      );
    } else if (user.role === "admin") {
      // For admin without subjectId, get all attendance records
      attendanceRecords = await this.attendanceRepository.findByFilter({
        ...(startDate && { createdAt: { $gte: startDate } }),
        ...(endDate && { createdAt: { $lte: endDate } }),
      });
    } else {
      // For teacher without subjectId (shouldn't happen due to earlier check)
      const error = new Error("Subject ID is required for teachers") as any;
      error.statusCode = 400;
      error.code = "SUBJECT_ID_REQUIRED";
      throw error;
    }

    // Calculate statistics
    const totalSessions = attendanceRecords.length;
    const completeSessions = attendanceRecords.filter(
      (record) => record.status === "checked-out"
    ).length;
    const incompleteSessions = totalSessions - completeSessions;
    const presentCount = attendanceRecords.filter(
      (record) => record.attendanceStatus === "present"
    ).length;
    const absentCount = totalSessions - presentCount;

    return {
      totalSessions,
      completeSessions,
      incompleteSessions,
      presentCount,
      absentCount,
      attendanceRecords,
    };
  }

  /**
   * Get student attendance status details for a subject
   * @param studentId - ID of the student
   * @param subjectId - ID of the subject
   * @param startDate - Start date for filtering
   * @param endDate - End date for filtering
   * @param userId - ID of the user requesting status
   */
  async getStudentAttendanceStatus(
    studentId: string,
    subjectId: string,
    startDate: Date | undefined,
    endDate: Date | undefined,
    userId: string
  ) {
    // Verify user has access to this subject
    const hasAccess = await this.verifyUserSubjectAccess(userId, subjectId);
    if (!hasAccess) {
      const error = new Error("Not authorized to view student attendance for this subject") as any;
      error.statusCode = 403;
      error.code = "UNAUTHORIZED_SUBJECT_ACCESS";
      throw error;
    }

    const attendanceRecords = await this.attendanceRepository.getHistory(
      studentId,
      subjectId,
      startDate,
      endDate
    );

    // Populate student details for each record
    const populatedRecords = await Promise.all(
      attendanceRecords.map(async (record) => {
        const student = await Student.findById(record.studentId);
        return {
          ...record.toObject(),
          studentId: student
            ? {
                _id: student._id,
                firstName: student.firstName,
                lastName: student.lastName,
                email: student.email,
                personId: student.personId,
              }
            : record.studentId,
        };
      })
    );

    const totalDays = attendanceRecords.length;
    const presentDays = attendanceRecords.filter(
      (record) => record.attendanceStatus === "present"
    ).length;
    const absentDays = totalDays - presentDays;
    const presentPercentage = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;

    return {
      totalDays,
      presentDays,
      absentDays,
      presentPercentage: Math.round(presentPercentage * 100) / 100, // Round to 2 decimal places
      records: populatedRecords,
    };
  }

  /**
   * Get all attendance records for today only
   * Records reset to empty array at the start of each day
   * @param userId - ID of the user requesting records
   */
  async getAllAttendance(userId: string): Promise<{
    date: string;
    total: number;
    present: number;
    absent: number;
    records: AttendanceModel[];
  }> {
    // Get today's date range in Philippines timezone (UTC+8)
    const philippinesOffset = 8 * 60; // 8 hours in minutes
    const now = new Date();

    // Convert current time to Philippines time
    const philippinesTime = new Date(now.getTime() + philippinesOffset * 60 * 1000);

    // Get start of day in Philippines timezone
    const todayPhilippines = new Date(
      philippinesTime.getFullYear(),
      philippinesTime.getMonth(),
      philippinesTime.getDate()
    );

    // Convert back to UTC for database query
    const todayUTC = new Date(todayPhilippines.getTime() - philippinesOffset * 60 * 1000);
    const tomorrowUTC = new Date(todayUTC.getTime() + 24 * 60 * 60 * 1000);

    try {
      // Check if user is admin
      const user = await User.findById(userId);
      if (!user) {
        const error = new Error("User not found") as any;
        error.statusCode = 404;
        error.code = "USER_NOT_FOUND";
        throw error;
      }

      let query: any = {
        createdAt: {
          $gte: todayUTC,
          $lt: tomorrowUTC,
        },
      };

      // If not admin, filter by teacher's subjects
      if (user.role !== "admin") {
        const teacherSubjects = await Subject.find({ instructor: userId }).select("_id");
        const subjectIds = teacherSubjects.map((subject) => subject._id);
        query.subjectId = { $in: subjectIds };
      }

      // Get attendance records
      const records = await this.attendanceRepository.findByFilter(query);

      // Calculate statistics
      const total = records.length;
      const present = records.filter((r) => r.attendanceStatus === "present").length;
      const absent = records.filter((r) => r.attendanceStatus === "absent").length;

      return {
        date: todayPhilippines.toISOString().split("T")[0], // YYYY-MM-DD format in Philippines date
        total,
        present,
        absent,
        records,
      };
    } catch (error) {
      const err = new Error("Failed to fetch attendance records") as any;
      err.statusCode = 500;
      err.code = "FETCH_ERROR";
      throw err;
    }
  }

  /**
   * Calculate overall attendance statistics with optional filtering
   * @param filters - Optional filters for student, subject, and date range
   * @param userId - ID of the user requesting stats
   */
  async calculateOverallAttendanceStats(
    filters:
      | {
          studentId?: string;
          subjectId?: string;
          startDate?: Date;
          endDate?: Date;
        }
      | undefined,
    userId: string
  ): Promise<{
    totalRecords: number;
    totalPresent: number;
    totalAbsent: number;
    attendancePercentage: number;
    checkedInCount: number;
    checkedOutCount: number;
    incompleteSessionsCount: number;
    dailyBreakdown?: Array<{
      date: string;
      present: number;
      absent: number;
      total: number;
      attendancePercentage: number;
    }>;
    subjectBreakdown?: Array<{
      subjectId: string;
      subjectName: string;
      present: number;
      absent: number;
      total: number;
      attendancePercentage: number;
    }>;
    studentBreakdown?: Array<{
      studentId: string;
      studentName: string;
      present: number;
      absent: number;
      total: number;
      attendancePercentage: number;
    }>;
  }> {
    try {
      // Check if user is admin
      const user = await User.findById(userId);
      if (!user) {
        const error = new Error("User not found") as any;
        error.statusCode = 404;
        error.code = "USER_NOT_FOUND";
        throw error;
      }

      // Build query filters
      const query: any = {};

      // If specific subject is provided, verify access for non-admin users
      if (filters?.subjectId) {
        if (user.role !== "admin") {
          const hasAccess = await this.verifyUserSubjectAccess(userId, filters.subjectId);
          if (!hasAccess) {
            const error = new Error(
              "Not authorized to view attendance stats for this subject"
            ) as any;
            error.statusCode = 403;
            error.code = "UNAUTHORIZED_SUBJECT_ACCESS";
            throw error;
          }
        }
        query.subjectId = new mongoose.Types.ObjectId(filters.subjectId);
      } else if (user.role !== "admin") {
        // If no specific subject and not admin, only show stats for subjects taught by this teacher
        const teacherSubjects = await Subject.find({ instructor: userId }).select("_id");
        query.subjectId = { $in: teacherSubjects.map((subject) => subject._id) };
      }

      if (filters?.studentId) {
        query.studentId = new mongoose.Types.ObjectId(filters.studentId);
      }

      if (filters?.startDate || filters?.endDate) {
        query.createdAt = {};
        if (filters.startDate) {
          query.createdAt.$gte = filters.startDate;
        }
        if (filters.endDate) {
          query.createdAt.$lte = filters.endDate;
        }
      }

      // Get filtered attendance records with populated data
      const records = await AttendanceSchema.find(query)
        .populate("studentId", "firstName lastName email")
        .populate("subjectId", "name code")
        .sort({ createdAt: -1 });

      // Calculate basic statistics
      const totalRecords = records.length;
      const totalPresent = records.filter(
        (record: AttendanceModel) => record.attendanceStatus === "present"
      ).length;
      const totalAbsent = records.filter(
        (record: AttendanceModel) => record.attendanceStatus === "absent"
      ).length;
      const attendancePercentage =
        totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 10000) / 100 : 0;

      const checkedInCount = records.filter(
        (record: AttendanceModel) => record.status === "checked-in"
      ).length;
      const checkedOutCount = records.filter(
        (record: AttendanceModel) => record.status === "checked-out"
      ).length;
      const incompleteSessionsCount = checkedInCount - checkedOutCount;

      // Calculate daily breakdown
      const dailyStats = new Map<string, { present: number; absent: number; total: number }>();

      records.forEach((record: AttendanceModel) => {
        const dateKey = record.createdAt.toISOString().split("T")[0]; // YYYY-MM-DD format

        if (!dailyStats.has(dateKey)) {
          dailyStats.set(dateKey, { present: 0, absent: 0, total: 0 });
        }

        const dayStats = dailyStats.get(dateKey)!;
        dayStats.total++;

        if (record.attendanceStatus === "present") {
          dayStats.present++;
        } else {
          dayStats.absent++;
        }
      });

      const dailyBreakdown = Array.from(dailyStats.entries())
        .map(([date, stats]) => ({
          date,
          present: stats.present,
          absent: stats.absent,
          total: stats.total,
          attendancePercentage:
            stats.total > 0 ? Math.round((stats.present / stats.total) * 10000) / 100 : 0,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Calculate subject breakdown (if not filtering by specific subject)
      let subjectBreakdown:
        | Array<{
            subjectId: string;
            subjectName: string;
            present: number;
            absent: number;
            total: number;
            attendancePercentage: number;
          }>
        | undefined;

      if (!filters?.subjectId) {
        const subjectStats = new Map<
          string,
          {
            name: string;
            present: number;
            absent: number;
            total: number;
          }
        >();

        records.forEach((record: AttendanceModel) => {
          if (
            record.subjectId &&
            typeof record.subjectId === "object" &&
            "name" in record.subjectId
          ) {
            const subjectId = (record.subjectId as any)._id.toString();
            const subjectName = (record.subjectId as any).name;

            if (!subjectStats.has(subjectId)) {
              subjectStats.set(subjectId, { name: subjectName, present: 0, absent: 0, total: 0 });
            }

            const stats = subjectStats.get(subjectId)!;
            stats.total++;

            if (record.attendanceStatus === "present") {
              stats.present++;
            } else {
              stats.absent++;
            }
          }
        });

        subjectBreakdown = Array.from(subjectStats.entries()).map(([subjectId, stats]) => ({
          subjectId,
          subjectName: stats.name,
          present: stats.present,
          absent: stats.absent,
          total: stats.total,
          attendancePercentage:
            stats.total > 0 ? Math.round((stats.present / stats.total) * 10000) / 100 : 0,
        }));
      }

      // Calculate student breakdown (if not filtering by specific student)
      let studentBreakdown:
        | Array<{
            studentId: string;
            studentName: string;
            present: number;
            absent: number;
            total: number;
            attendancePercentage: number;
          }>
        | undefined;

      if (!filters?.studentId) {
        const studentStats = new Map<
          string,
          {
            name: string;
            present: number;
            absent: number;
            total: number;
          }
        >();

        records.forEach((record: AttendanceModel) => {
          if (
            record.studentId &&
            typeof record.studentId === "object" &&
            "firstName" in record.studentId
          ) {
            const studentId = (record.studentId as any)._id.toString();
            const studentName = `${(record.studentId as any).firstName} ${(record.studentId as any).lastName}`;

            if (!studentStats.has(studentId)) {
              studentStats.set(studentId, { name: studentName, present: 0, absent: 0, total: 0 });
            }

            const stats = studentStats.get(studentId)!;
            stats.total++;

            if (record.attendanceStatus === "present") {
              stats.present++;
            } else {
              stats.absent++;
            }
          }
        });

        studentBreakdown = Array.from(studentStats.entries()).map(([studentId, stats]) => ({
          studentId,
          studentName: stats.name,
          present: stats.present,
          absent: stats.absent,
          total: stats.total,
          attendancePercentage:
            stats.total > 0 ? Math.round((stats.present / stats.total) * 10000) / 100 : 0,
        }));
      }

      return {
        totalRecords,
        totalPresent,
        totalAbsent,
        attendancePercentage,
        checkedInCount,
        checkedOutCount,
        incompleteSessionsCount,
        dailyBreakdown,
        subjectBreakdown,
        studentBreakdown,
      };
    } catch (error: any) {
      const err = new Error("Failed to calculate attendance statistics") as any;
      err.statusCode = 500;
      err.code = "STATS_CALCULATION_ERROR";
      throw err;
    }
  }

  /**
   * Export attendance records for a teacher's subject to CSV
   * @param userId - ID of the teacher
   * @param subjectId - Optional subject ID to filter records
   * @returns Object containing CSV data and filename
   */
  async exportAttendanceToCSV(
    userId: string,
    subjectId?: string
  ): Promise<{ csvData: string; filename: string }> {
    try {
      // Check if user exists and get their details
      const user = await User.findById(userId).select("name email role");
      if (!user) {
        const error = new Error("User not found") as any;
        error.statusCode = 404;
        error.code = "USER_NOT_FOUND";
        throw error;
      }

      // Build query for attendance records
      let query: any = {};

      // If specific subject is provided, verify access
      if (subjectId) {
        const hasAccess = await this.verifyUserSubjectAccess(userId, subjectId);
        if (!hasAccess) {
          const error = new Error("Not authorized to access this subject's attendance") as any;
          error.statusCode = 403;
          error.code = "UNAUTHORIZED_SUBJECT_ACCESS";
          throw error;
        }
        query.subjectId = new mongoose.Types.ObjectId(subjectId);
      } else if (user.role !== "admin") {
        // If no specific subject and not admin, get all subjects taught by this teacher
        const teacherSubjects = await Subject.find({ instructor: userId }).select("_id");
        query.subjectId = { $in: teacherSubjects.map((subject) => subject._id) };
      }

      // Get today's date range in Philippines timezone (UTC+8)
      const philippinesOffset = 8 * 60; // 8 hours in minutes
      const now = new Date();
      const philippinesTime = new Date(now.getTime() + philippinesOffset * 60 * 1000);
      const todayPhilippines = new Date(
        philippinesTime.getFullYear(),
        philippinesTime.getMonth(),
        philippinesTime.getDate()
      );
      const todayUTC = new Date(todayPhilippines.getTime() - philippinesOffset * 60 * 1000);
      const tomorrowUTC = new Date(todayUTC.getTime() + 24 * 60 * 60 * 1000);

      // Add date filter for today only
      query.createdAt = {
        $gte: todayUTC,
        $lt: tomorrowUTC,
      };

      // Get attendance records with populated data
      const attendanceRecords = await AttendanceSchema.find(query)
        .populate("studentId", "firstName lastName email")
        .populate("subjectId", "name code")
        .sort({ createdAt: -1 });

      // Add teacher information to each record
      const recordsWithTeacher = attendanceRecords.map((record) => ({
        ...record.toObject(),
        teacher: {
          name: user.name,
          email: user.email,
        },
      }));

      // Generate CSV data
      const csvData = CSVExportHelper.exportAttendanceToCSV(recordsWithTeacher);

      // Generate filename with date
      const dateStr = todayPhilippines.toISOString().split("T")[0];
      const filename = CSVExportHelper.generateCSVFilename(`attendance_${dateStr}`);

      return {
        csvData,
        filename,
      };
    } catch (error: any) {
      if (error.statusCode) throw error;

      const err = new Error("Failed to export attendance records") as any;
      err.statusCode = 500;
      err.code = "ATTENDANCE_EXPORT_ERROR";
      throw err;
    }
  }
}
