import { Request, Response } from "express";
import { route } from "express-extract-routes";
import { AuthMiddleware, Authenticated } from "../middleware/authMiddleware";
import { upload } from "../middleware/multer";
import { UseMiddleware } from "../middleware/useMiddleware";
import { Student } from "../models/studentModel";
import { AttendanceService } from "../services/attendanceService";
import { FaceRecognitionService } from "../services/faceRecognitionService";
import { SMSService } from "../services/smsService";

// Purpose: This controller class is responsible for handling attendance-related requests.
@route("/attendance")
@Authenticated()
export class AttendanceController {
  private attendanceService: AttendanceService;
  private faceRecognitionService: FaceRecognitionService;
  private smsService: SMSService;

  constructor() {
    this.attendanceService = new AttendanceService();
    this.faceRecognitionService = new FaceRecognitionService();
    this.smsService = new SMSService();
  }

  /**
   * @swagger
   * /attendance/process:
   *   post:
   *     summary: Process attendance (check-in/check-out) automatically using face recognition
   *     description: Automatically identifies the student using face recognition and processes attendance. No need to provide student ID.
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             required:
   *               - photo
   *               - subjectId
   *             properties:
   *               photo:
   *                 type: string
   *                 format: binary
   *                 description: Student's photo for face recognition
   *               subjectId:
   *                 type: string
   *                 description: ID of the subject for attendance
   *     responses:
   *       200:
   *         description: Attendance processed successfully with populated student and subject data
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   properties:
   *                     status:
   *                       type: string
   *                       enum: [checked-in, checked-out]
   *                     attendanceStatus:
   *                       type: string
   *                       enum: [present, absent]
   *                       description: Indicates if the student is marked as present or absent
   *                     studentId:
   *                       type: object
   *                       description: Populated student information
   *                     subjectId:
   *                       type: object
   *                       description: Populated subject information
   *                 message:
   *                   type: string
   *       400:
   *         description: Invalid request, face not recognized, or low confidence
   *       403:
   *         description: Unauthorized access
   *       404:
   *         description: Student or subject not found
   *     tags: [Attendance]
   */
  @route.post("/process")
  @UseMiddleware(upload.single("photo"))
  async processAttendance(req: Request, res: Response): Promise<Response> {
    try {
      // Verify user has permission to mark attendance
      if (!["admin", "teacher"].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Not authorized to mark attendance",
            statusCode: 403,
          },
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: {
            code: "NO_PHOTO",
            message: "No photo provided",
            statusCode: 400,
          },
        });
      }

      if (!req.body.subjectId) {
        return res.status(400).json({
          success: false,
          error: {
            code: "NO_SUBJECT_ID",
            message: "Subject ID is required",
            statusCode: 400,
          },
        });
      }

      try {
        const attendance = await this.attendanceService.processAttendance(
          req.file.buffer,
          req.body.subjectId,
          req.file.originalname
        );

        return res.status(200).json({
          success: true,
          data: attendance,
          message: `Successfully ${attendance.status === "checked-in" ? "checked in" : "checked out"}`,
        });
      } catch (error: any) {
        return res.status(error.statusCode || 500).json({
          success: false,
          error: {
            code: error.code || "ATTENDANCE_ERROR",
            message: error.message || "Failed to process attendance",
            statusCode: error.statusCode || 500,
          },
        });
      }
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Internal server error",
          statusCode: 500,
        },
      });
    }
  }

  /**
   * @swagger
   * /attendance/history:
   *   get:
   *     summary: Get attendance history
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: subjectId
   *         schema:
   *           type: string
   *         description: Optional subject ID for filtering
   *       - in: query
   *         name: startDate
   *         schema:
   *           type: string
   *           format: date
   *         description: Start date for filtering (ISO format)
   *       - in: query
   *         name: endDate
   *         schema:
   *           type: string
   *           format: date
   *         description: End date for filtering (ISO format)
   *     responses:
   *       200:
   *         description: List of attendance records
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       userId:
   *                         type: string
   *                       subjectId:
   *                         type: string
   *                       checkInTime:
   *                         type: string
   *                         format: date-time
   *                       checkOutTime:
   *                         type: string
   *                         format: date-time
   *                       status:
   *                         type: string
   *                         enum: [checked-in, checked-out]
   *                       attendanceStatus:
   *                         type: string
   *                         enum: [present, absent]
   *                         description: Indicates if the student was present or absent
   *                       confidence:
   *                         type: number
   *                         description: Face recognition confidence score
   *       400:
   *         description: Invalid request
   *       403:
   *         description: Unauthorized access
   *     tags: [Attendance]
   */
  @route.get("/history")
  async getAttendanceHistory(req: Request, res: Response): Promise<Response> {
    try {
      const { subjectId, startDate, endDate } = req.query;

      const history = await this.attendanceService.getAttendanceHistory(
        subjectId as string | undefined,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined,
        req.user.id
      );

      return res.status(200).json({
        success: true,
        data: history,
      });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        error: {
          code: error.code || "HISTORY_FETCH_ERROR",
          message: error.message || "Failed to fetch attendance history",
          statusCode: error.statusCode || 500,
        },
      });
    }
  }

  /**
   * @swagger
   * /attendance/subject/stats:
   *   get:
   *     summary: Get attendance statistics for a subject (Teachers and Admins only)
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: subjectId
   *         required: false
   *         schema:
   *           type: string
   *         description: The subject ID (required for teachers, optional for admins)
   *       - in: query
   *         name: startDate
   *         schema:
   *           type: string
   *           format: date
   *         description: Start date for filtering (ISO format)
   *       - in: query
   *         name: endDate
   *         schema:
   *           type: string
   *           format: date
   *         description: End date for filtering (ISO format)
   *     responses:
   *       200:
   *         description: Subject attendance statistics
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   properties:
   *                     totalSessions:
   *                       type: number
   *                     completeSessions:
   *                       type: number
   *                     incompleteSessions:
   *                       type: number
   *                     presentCount:
   *                       type: number
   *                       description: Number of sessions where students were marked present
   *                     absentCount:
   *                       type: number
   *                       description: Number of sessions where students were marked absent
   *                     attendanceRecords:
   *                       type: array
   *       404:
   *         description: Subject not found
   *     tags: [Attendance]
   */
  @route.get("/subject/stats")
  @UseMiddleware(new AuthMiddleware().authorize("teacher", "admin"))
  async getSubjectStats(req: Request, res: Response): Promise<Response> {
    try {
      const { subjectId } = req.query;
      const { startDate, endDate } = req.query;

      const stats = await this.attendanceService.getSubjectAttendanceStats(
        subjectId as string | undefined,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined,
        req.user.id
      );

      return res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        error: {
          code: error.code || "STATS_FETCH_ERROR",
          message: error.message || "Failed to fetch attendance stats",
          statusCode: error.statusCode || 500,
        },
      });
    }
  }

  /**
   * @swagger
   * /attendance/enroll:
   *   post:
   *     summary: Enroll a user's face in the system
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             properties:
   *               photo:
   *                 type: string
   *                 format: binary
   *               studentId:
   *                 type: string
   *     responses:
   *       200:
   *         description: Face enrolled successfully
   *       400:
   *         description: Invalid request
   *       404:
   *         description: User not found
   *     tags: [Attendance]
   */
  @route.post("/enroll")
  @UseMiddleware(upload.single("photo"))
  async enrollUserFace(req: Request, res: Response): Promise<Response> {
    try {
      // Only allow users to enroll their own face unless admin
      if (req.user.role !== "admin" && req.user.id !== req.body.studentId) {
        return res.status(403).json({
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Not authorized to enroll face for this user",
            statusCode: 403,
          },
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: {
            code: "NO_PHOTO",
            message: "No photo provided",
            statusCode: 400,
          },
        });
      }

      const student = await Student.findById(req.body.studentId);
      if (!student) {
        return res.status(404).json({
          success: false,
          error: {
            code: "USER_NOT_FOUND",
            message: "User not found",
            statusCode: 404,
          },
        });
      }

      // Enroll the face using the students ID as the name
      const enrollmentResult = await this.faceRecognitionService.enrollPerson(
        student._id.toString(),
        req.file.buffer,
        "1",
        [],
        req.file.originalname
      );

      // Update user record with the person UUID from face recognition system
      await Student.findByIdAndUpdate(student._id, { personId: enrollmentResult.id });

      return res.status(200).json({
        success: true,
        message: "Face enrolled successfully",
        data: {
          studentId: student._id,
          personId: enrollmentResult.id,
          faces: enrollmentResult.faces,
        },
      });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        error: {
          code: error.code || "ENROLLMENT_ERROR",
          message: error.message || "Failed to enroll face",
          statusCode: error.statusCode || 500,
        },
      });
    }
  }

  /**
   * @swagger
   * /attendance/student-status:
   *   get:
   *     summary: Get attendance status details for a student in a subject
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *         description: The student ID
   *       - in: query
   *         name: subjectId
   *         required: true
   *         schema:
   *           type: string
   *         description: The subject ID
   *       - in: query
   *         name: startDate
   *         schema:
   *           type: string
   *           format: date
   *         description: Start date for filtering (ISO format)
   *       - in: query
   *         name: endDate
   *         schema:
   *           type: string
   *           format: date
   *         description: End date for filtering (ISO format)
   *     responses:
   *       200:
   *         description: Student attendance status details
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   properties:
   *                     totalDays:
   *                       type: number
   *                     presentDays:
   *                       type: number
   *                     absentDays:
   *                       type: number
   *                     presentPercentage:
   *                       type: number
   *                     records:
   *                       type: array
   *       400:
   *         description: Invalid request
   *       403:
   *         description: Unauthorized access
   *     tags: [Attendance]
   */
  @route.get("/student-status")
  async getStudentAttendanceStatus(req: Request, res: Response): Promise<Response> {
    try {
      const { studentId, subjectId, startDate, endDate } = req.query;

      if (!studentId || !subjectId) {
        return res.status(400).json({
          success: false,
          error: {
            code: "MISSING_PARAMETERS",
            message: "Both studentId and subjectId are required",
            statusCode: 400,
          },
        });
      }

      const status = await this.attendanceService.getStudentAttendanceStatus(
        studentId as string,
        subjectId as string,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined,
        req.user.id
      );

      return res.status(200).json({
        success: true,
        data: status,
      });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        error: {
          code: error.code || "STATUS_FETCH_ERROR",
          message: error.message || "Failed to fetch attendance status",
          statusCode: error.statusCode || 500,
        },
      });
    }
  }

  /**
   * @swagger
   * /attendance/today:
   *   get:
   *     summary: Get all attendance records for today
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Today's attendance records and statistics
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   properties:
   *                     date:
   *                       type: string
   *                       format: date
   *                       description: Today's date (YYYY-MM-DD)
   *                     total:
   *                       type: number
   *                       description: Total number of attendance records
   *                     present:
   *                       type: number
   *                       description: Number of present students
   *                     absent:
   *                       type: number
   *                       description: Number of absent students
   *                     records:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           userId:
   *                             type: string
   *                           subjectId:
   *                             type: string
   *                           checkInTime:
   *                             type: string
   *                             format: date-time
   *                           checkOutTime:
   *                             type: string
   *                             format: date-time
   *                           status:
   *                             type: string
   *                             enum: [checked-in, checked-out]
   *                           attendanceStatus:
   *                             type: string
   *                             enum: [present, absent]
   *       500:
   *         description: Server error
   *     tags: [Attendance]
   */
  @route.get("/today")
  async getTodayAttendance(req: Request, res: Response): Promise<Response> {
    try {
      const attendance = await this.attendanceService.getAllAttendance(req.user.id);

      return res.status(200).json({
        success: true,
        data: attendance,
      });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        error: {
          code: error.code || "FETCH_ERROR",
          message: error.message || "Failed to fetch today's attendance",
          statusCode: error.statusCode || 500,
        },
      });
    }
  }

  /**
   * @swagger
   * /attendance/test-sms:
   *   post:
   *     summary: Send a test voice call to verify Twilio configuration
   *     description: Send a test voice call to verify that Twilio is properly configured
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - phoneNumber
   *             properties:
   *               phoneNumber:
   *                 type: string
   *                 description: Phone number to send test SMS to
   *                 example: "+639123456789"
   *     responses:
   *       200:
   *         description: Test SMS sent successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *       400:
   *         description: Invalid phone number or missing parameters
   *       403:
   *         description: Unauthorized access
   *       500:
   *         description: Failed to send SMS
   *     tags: [Attendance]
   */
  @route.post("/test-sms")
  @UseMiddleware(new AuthMiddleware().authorize("admin"))
  async testSMS(req: Request, res: Response): Promise<Response> {
    try {
      const { phoneNumber } = req.body;

      if (!phoneNumber) {
        return res.status(400).json({
          success: false,
          error: {
            code: "MISSING_PHONE_NUMBER",
            message: "Phone number is required",
            statusCode: 400,
          },
        });
      }

      // Check if SMS service is configured
      if (!this.smsService.isConfigured()) {
        return res.status(500).json({
          success: false,
          error: {
            code: "SMS_NOT_CONFIGURED",
            message: "SMS service is not properly configured. Please check Twilio credentials.",
            statusCode: 500,
          },
        });
      }

      await this.smsService.sendTestMessage(phoneNumber);

      return res.status(200).json({
        success: true,
        message: "Test SMS sent successfully",
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: {
          code: "SMS_SEND_ERROR",
          message: error.message || "Failed to send test SMS",
          statusCode: 500,
        },
      });
    }
  }

  /**
   * @swagger
   * /attendance/stats:
   *   get:
   *     summary: Get comprehensive attendance statistics with optional filtering
   *     description: Calculate total present, absent, and attendance percentage with breakdowns by date, subject, and student
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: studentId
   *         schema:
   *           type: string
   *         description: Filter by specific student ID
   *       - in: query
   *         name: subjectId
   *         schema:
   *           type: string
   *         description: Filter by specific subject ID
   *       - in: query
   *         name: startDate
   *         schema:
   *           type: string
   *           format: date
   *         description: Start date for filtering (ISO format)
   *       - in: query
   *         name: endDate
   *         schema:
   *           type: string
   *           format: date
   *         description: End date for filtering (ISO format)
   *     responses:
   *       200:
   *         description: Comprehensive attendance statistics
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   properties:
   *                     totalRecords:
   *                       type: number
   *                       description: Total number of attendance records
   *                     totalPresent:
   *                       type: number
   *                       description: Total number of present records
   *                     totalAbsent:
   *                       type: number
   *                       description: Total number of absent records
   *                     attendancePercentage:
   *                       type: number
   *                       description: Overall attendance percentage
   *                     checkedInCount:
   *                       type: number
   *                       description: Number of checked-in sessions
   *                     checkedOutCount:
   *                       type: number
   *                       description: Number of checked-out sessions
   *                     incompleteSessionsCount:
   *                       type: number
   *                       description: Number of incomplete sessions (checked-in but not checked-out)
   *                     dailyBreakdown:
   *                       type: array
   *                       description: Daily attendance statistics
   *                       items:
   *                         type: object
   *                         properties:
   *                           date:
   *                             type: string
   *                             format: date
   *                           present:
   *                             type: number
   *                           absent:
   *                             type: number
   *                           total:
   *                             type: number
   *                           attendancePercentage:
   *                             type: number
   *                     subjectBreakdown:
   *                       type: array
   *                       description: Subject-wise attendance statistics (only when not filtering by subject)
   *                       items:
   *                         type: object
   *                         properties:
   *                           subjectId:
   *                             type: string
   *                           subjectName:
   *                             type: string
   *                           present:
   *                             type: number
   *                           absent:
   *                             type: number
   *                           total:
   *                             type: number
   *                           attendancePercentage:
   *                             type: number
   *                     studentBreakdown:
   *                       type: array
   *                       description: Student-wise attendance statistics (only when not filtering by student)
   *                       items:
   *                         type: object
   *                         properties:
   *                           studentId:
   *                             type: string
   *                           studentName:
   *                             type: string
   *                           present:
   *                             type: number
   *                           absent:
   *                             type: number
   *                           total:
   *                             type: number
   *                           attendancePercentage:
   *                             type: number
   *       403:
   *         description: Unauthorized access
   *       500:
   *         description: Server error
   *     tags: [Attendance]
   */
  @route.get("/stats")
  async getOverallAttendanceStats(req: Request, res: Response): Promise<Response> {
    try {
      const { studentId, subjectId, startDate, endDate } = req.query;

      // Build filters object
      const filters: {
        studentId?: string;
        subjectId?: string;
        startDate?: Date;
        endDate?: Date;
      } = {};

      if (studentId) filters.studentId = studentId as string;
      if (subjectId) filters.subjectId = subjectId as string;
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);

      const stats = await this.attendanceService.calculateOverallAttendanceStats(
        filters,
        req.user.id
      );

      return res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        error: {
          code: error.code || "STATS_CALCULATION_ERROR",
          message: error.message || "Failed to calculate attendance statistics",
          statusCode: error.statusCode || 500,
        },
      });
    }
  }

  /**
   * @swagger
   * /attendance/export:
   *   get:
   *     summary: Export today's attendance records to CSV (Teachers and Admins only)
   *     description: Export attendance records for today in CSV format. Teachers can only export their subjects' attendance.
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: subjectId
   *         schema:
   *           type: string
   *         description: Optional subject ID to filter records for a specific subject
   *     responses:
   *       200:
   *         description: CSV file containing attendance records
   *         content:
   *           text/csv:
   *             schema:
   *               type: string
   *               format: binary
   *       403:
   *         description: Unauthorized access
   *       500:
   *         description: Server error
   *     tags: [Attendance]
   */
  @route.get("/export")
  @UseMiddleware(new AuthMiddleware().authorize("teacher", "admin"))
  async exportAttendanceToCSV(req: Request, res: Response): Promise<void> {
    try {
      const { subjectId } = req.query;

      const result = await this.attendanceService.exportAttendanceToCSV(
        req.user.id,
        subjectId as string | undefined
      );

      // Set headers for CSV download
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);

      // Send the CSV data
      res.send(result.csvData);
    } catch (error: any) {
      // Since we already set headers for CSV, we need to clear them for JSON error response
      res.setHeader("Content-Type", "application/json");
      res.status(error.statusCode || 500).json({
        success: false,
        error: {
          code: error.code || "EXPORT_ERROR",
          message: error.message || "Failed to export attendance records",
          statusCode: error.statusCode || 500,
        },
      });
    }
  }
}
