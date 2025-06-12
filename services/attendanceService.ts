import { AttendanceModel } from "../models/attendanceModel";
import { Subject } from "../models/subjectModel";
import { Student, StudentModel } from "../models/studentModel";
import { AttendanceRepository } from "../repositories/attendanceRepository";
import { FaceRecognitionService } from "./faceRecognitionService";
import mongoose from "mongoose";

export class AttendanceService {
  private faceRecognitionService: FaceRecognitionService;
  private attendanceRepository: AttendanceRepository;

  constructor() {
    this.faceRecognitionService = new FaceRecognitionService();
    this.attendanceRepository = new AttendanceRepository();
  }

  /**
   * Process attendance using face recognition for a specific subject
   * @param photoBuffer - Buffer of the photo to verify
   * @param student - Student attempting to check in/out
   * @param subjectId - ID of the subject for attendance
   * @param filename - Original filename of the uploaded photo
   */
  async processAttendance(
    photoBuffer: Buffer,
    student: StudentModel,
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

    if (subject.schedule.day !== currentDay) {
      const error = new Error(`No class scheduled for ${currentDay}`) as any;
      error.statusCode = 400;
      error.code = "NO_CLASS_SCHEDULED";
      throw error;
    }

    // const currentTimeStr = currentTime.toTimeString().slice(0, 5); // HH:MM format
    // if (currentTimeStr < subject.schedule.startTime || currentTimeStr > subject.schedule.endTime) {
    //   const error = new Error("Attendance can only be marked during class hours") as any;
    //   error.statusCode = 400;
    //   error.code = "OUTSIDE_CLASS_HOURS";
    //   throw error;
    // }

    // Check if user has personId (enrolled face)
    if (!student.personId) {
      const error = new Error("Student has not enrolled their face") as any;
      error.statusCode = 400;
      error.code = "FACE_NOT_ENROLLED";
      throw error;
    }

    // Get latest attendance record for the student in this subject
    const latestAttendance = await this.attendanceRepository.findLatestByStudentAndSubject(
      student._id,
      subjectId
    );

    // Verify the person's face only after all other validations pass
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
    console.log("Student personId:", student.personId);
    console.log("Student _id:", student._id.toString());

    if (match.confidence < 0.8) {
      const error = new Error("Face verification confidence too low") as any;
      error.statusCode = 400;
      error.code = "LOW_CONFIDENCE";
      throw error;
    }

    // Check if the name matches the students ID (which we used as the name during enrollment)
    if (match.name !== student._id.toString()) {
      const error = new Error("Face does not match registered student") as any;
      error.statusCode = 400;
      error.code = "FACE_MISMATCH";
      throw error;
    }

    try {
      if (!latestAttendance || latestAttendance.status === "checked-out") {
        // Create check-in record
        return await this.attendanceRepository.create({
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
        return await this.attendanceRepository.update(latestAttendance);
      }
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
    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    try {
      // Get all attendance records for today
      const records = await this.attendanceRepository.findByFilter({
        createdAt: {
          $gte: today,
          $lt: tomorrow,
        },
      });

      // Calculate statistics
      const total = records.length;
      const present = records.filter((r) => r.attendanceStatus === "present").length;
      const absent = records.filter((r) => r.attendanceStatus === "absent").length;

      return {
        date: today.toISOString().split("T")[0], // YYYY-MM-DD format
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
}
