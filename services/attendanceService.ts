import mongoose from "mongoose";
import { AttendanceModel } from "../models/attendanceModel";
import AttendanceSchema from "../models/attendanceModel";
import { Student } from "../models/studentModel";
import { Subject } from "../models/subjectModel";
import { AttendanceRepository } from "../repositories/attendanceRepository";
import { FaceRecognitionService } from "./faceRecognitionService";
import { SMSService } from "./smsService";

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
    const currentTime = new Date();
    const currentDay = currentTime.toLocaleDateString("en-US", { weekday: "long" });

    // if (subject.schedule.day !== currentDay) {
    //   const error = new Error(`No class scheduled for ${currentDay}`) as any;
    //   error.statusCode = 400;
    //   error.code = "NO_CLASS_SCHEDULED";
    //   throw error;
    // }

    // const currentTimeStr = currentTime.toTimeString().slice(0, 5); // HH:MM format
    // if (currentTimeStr < subject.schedule.startTime || currentTimeStr > subject.schedule.endTime) {
    //   const error = new Error("Attendance can only be marked during class hours") as any;
    //   error.statusCode = 400;
    //   error.code = "OUTSIDE_CLASS_HOURS";
    //   throw error;
    // }

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
   * Get attendance history for a user in a specific subject
   * @param studentId - ID of the student
   * @param subjectId - ID of the subject
   * @param startDate - Start date for filtering
   * @param endDate - End date for filtering
   */
  async getAttendanceHistory(
    studentId: string,
    subjectId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<AttendanceModel[]> {
    return this.attendanceRepository.getHistory(studentId, subjectId, startDate, endDate);
  }

  /**
   * Get attendance statistics for a subject
   * @param subjectId - ID of the subject
   * @param startDate - Start date for statistics
   * @param endDate - End date for statistics
   */
  async getSubjectAttendanceStats(subjectId: string, startDate?: Date, endDate?: Date) {
    const attendanceRecords = await this.attendanceRepository.getSubjectAttendance(
      subjectId,
      startDate,
      endDate
    );

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
   */
  async getStudentAttendanceStatus(
    studentId: string,
    subjectId: string,
    startDate?: Date,
    endDate?: Date
  ) {
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
   * Get attendance status for all students in a subject
   * @param subjectId - ID of the subject
   * @param startDate - Start date for filtering
   * @param endDate - End date for filtering
   */
  async getSubjectStudentsAttendanceStatus(subjectId: string, startDate?: Date, endDate?: Date) {
    // First verify if subject exists
    const subject = await Subject.findById(subjectId);
    if (!subject) {
      const error = new Error("Subject not found") as any;
      error.statusCode = 404;
      error.code = "SUBJECT_NOT_FOUND";
      throw error;
    }

    const attendanceRecords = await this.attendanceRepository.getSubjectAttendance(
      subjectId,
      startDate,
      endDate
    );

    // Handle case when no records found
    if (!attendanceRecords || attendanceRecords.length === 0) {
      return {
        subject: {
          _id: subject._id,
          code: subject.code,
          name: subject.name,
          schedule: subject.schedule,
        },
        totalStudents: 0,
        studentsStats: [],
        overallStats: {
          totalDays: 0,
          presentCount: 0,
          absentCount: 0,
        },
      };
    }

    // Group records by student and populate user details
    const studentAttendance = new Map();

    // First, get all unique user IDs, filtering out any null or undefined values
    const studentIds = [
      ...new Set(
        attendanceRecords
          .filter((record) => record && record.studentId)
          .map((record) => {
            // Handle both string and object cases
            const studentId = record.studentId;
            if (typeof studentId === "object" && studentId !== null && "_id" in studentId) {
              return studentId._id as mongoose.Types.ObjectId;
            }
            return studentId as mongoose.Types.ObjectId;
          })
      ),
    ];

    if (studentIds.length === 0) {
      const error = new Error("No valid user IDs found in attendance records") as any;
      error.statusCode = 500;
      error.code = "INVALID_RECORDS";
      throw error;
    }

    // Fetch all users at once
    const students = await Student.find({ _id: { $in: studentIds } }).select("-password");
    const studentsMap = new Map(students.map((student) => [student._id.toString(), student]));

    // Process attendance records with user details
    attendanceRecords.forEach((record) => {
      if (!record || !record.studentId) {
        console.warn("Invalid attendance record found:", record);
        return; // Skip this record
      }

      try {
        // Handle both string and object cases for studentId
        const studentId =
          typeof record.studentId === "object" &&
          record.studentId !== null &&
          "_id" in record.studentId
            ? (record.studentId._id as mongoose.Types.ObjectId).toString()
            : (record.studentId as mongoose.Types.ObjectId).toString();

        const student = studentsMap.get(studentId);

        if (!studentAttendance.has(studentId)) {
          studentAttendance.set(studentId, {
            student: student
              ? {
                  _id: student._id,
                  firstName: student.firstName,
                  lastName: student.lastName,
                  email: student.email,
                  personId: student.personId,
                }
              : {
                  _id: studentId,
                  firtName: "Unknown student",
                  lastName: "N/A",
                  email: "N/A",
                  personId: "N/A",
                },
            totalDays: 0,
            presentDays: 0,
            absentDays: 0,
            records: [],
          });
        }

        const stats = studentAttendance.get(studentId);
        stats.totalDays++;
        if (record.attendanceStatus === "present") {
          stats.presentDays++;
        } else {
          stats.absentDays++;
        }
        stats.records.push(record);
      } catch (error) {
        console.error("Error processing attendance record:", error);
        // Continue with next record instead of breaking the entire process
      }
    });

    // Convert map to array and calculate percentages
    const studentsStats = Array.from(studentAttendance.entries()).map(([studentId, stats]) => ({
      student: stats.student,
      totalDays: stats.totalDays,
      presentDays: stats.presentDays,
      absentDays: stats.absentDays,
      presentPercentage:
        stats.totalDays > 0 ? Math.round((stats.presentDays / stats.totalDays) * 10000) / 100 : 0,
      records: stats.records,
    }));

    return {
      subject: {
        _id: subject._id,
        code: subject.code,
        name: subject.name,
        schedule: subject.schedule,
      },
      totalStudents: studentsStats.length,
      studentsStats,
      overallStats: {
        totalDays: attendanceRecords.length,
        presentCount: attendanceRecords.filter((r) => r && r.attendanceStatus === "present").length,
        absentCount: attendanceRecords.filter((r) => r && r.attendanceStatus === "absent").length,
      },
    };
  }

  /**
   * Get all attendance records for today only
   * Records reset to empty array at the start of each day
   */
  async getAllAttendance(): Promise<{
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
      // Get all attendance records for today
      const records = await this.attendanceRepository.findByFilter({
        createdAt: {
          $gte: todayUTC,
          $lt: tomorrowUTC,
        },
      });

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
   */
  async calculateOverallAttendanceStats(filters?: {
    studentId?: string;
    subjectId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
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
      // Build query filters
      const query: any = {};

      if (filters?.studentId) {
        query.studentId = new mongoose.Types.ObjectId(filters.studentId);
      }

      if (filters?.subjectId) {
        query.subjectId = new mongoose.Types.ObjectId(filters.subjectId);
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
}
