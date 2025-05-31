import { Request, Response } from "express";
import { route } from "express-extract-routes";
import { AuthMiddleware, Authenticated } from "../middleware/authMiddleware";
import { upload } from "../middleware/multer";
import { UseMiddleware } from "../middleware/useMiddleware";
import { User } from "../models/userModel";
import { AttendanceService } from "../services/attendanceService";
import { FaceRecognitionService } from "../services/faceRecognitionService";

// Purpose: This controller class is responsible for handling attendance-related requests.
@route("/attendance")
@Authenticated()
export class AttendanceController {
  private attendanceService: AttendanceService;
  private faceRecognitionService: FaceRecognitionService;

  constructor() {
    this.attendanceService = new AttendanceService();
    this.faceRecognitionService = new FaceRecognitionService();
  }

  /**
   * @swagger
   * /attendance/process:
   *   post:
   *     summary: Process attendance (check-in/check-out) for a specific subject
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             required:
   *               - photo
   *               - userId
   *               - subjectId
   *             properties:
   *               photo:
   *                 type: string
   *                 format: binary
   *               userId:
   *                 type: string
   *               subjectId:
   *                 type: string
   *     responses:
   *       200:
   *         description: Attendance processed successfully
   *       400:
   *         description: Invalid request or face verification failed
   *       403:
   *         description: User not enrolled in subject
   *       404:
   *         description: User or subject not found
   *     tags: [Attendance]
   */
  @route.post("/process")
  @UseMiddleware(upload.single("photo"))
  async processAttendance(req: Request, res: Response): Promise<Response> {
    try {
      // Verify user has permission to mark attendance
      if (!["student", "teacher"].includes(req.user.role)) {
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

      const user = await User.findById(req.body.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: {
            code: "USER_NOT_FOUND",
            message: "User not found",
            statusCode: 404,
          },
        });
      }

      try {
        const attendance = await this.attendanceService.processAttendance(
          req.file.buffer,
          user,
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
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *         description: The user ID
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
   *       400:
   *         description: Invalid request
   *     tags: [Attendance]
   */
  @route.get("/history")
  async getAttendanceHistory(req: Request, res: Response): Promise<Response> {
    try {
      const { userId, subjectId, startDate, endDate } = req.query;

      // Users can only view their own attendance unless they're admin/teacher
      if (req.user.role === "student" && userId !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Not authorized to view this attendance history",
            statusCode: 403,
          },
        });
      }

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: {
            code: "MISSING_USER_ID",
            message: "User ID is required",
            statusCode: 400,
          },
        });
      }

      const history = await this.attendanceService.getAttendanceHistory(
        userId as string,
        subjectId as string,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
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
   * /attendance/subject/{subjectId}/stats:
   *   get:
   *     summary: Get attendance statistics for a subject (Teachers and Admins only)
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
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
   *         description: Subject attendance statistics
   *       404:
   *         description: Subject not found
   *     tags: [Attendance]
   */
  @route.get("/subject/:subjectId/stats")
  @UseMiddleware(new AuthMiddleware().authorize("teacher", "admin"))
  async getSubjectStats(req: Request, res: Response): Promise<Response> {
    try {
      const { subjectId } = req.params;
      const { startDate, endDate } = req.query;

      const stats = await this.attendanceService.getSubjectAttendanceStats(
        subjectId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
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
   *               userId:
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
      if (req.user.role !== "admin" && req.user.id !== req.body.userId) {
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

      const user = await User.findById(req.body.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: {
            code: "USER_NOT_FOUND",
            message: "User not found",
            statusCode: 404,
          },
        });
      }

      // Enroll the face using the user's ID as the name
      const enrollmentResult = await this.faceRecognitionService.enrollPerson(
        user._id.toString(),
        req.file.buffer,
        "1",
        [],
        req.file.originalname
      );

      // Update user record with the person UUID from face recognition system
      user.personId = enrollmentResult.id;
      await user.save();

      return res.status(200).json({
        success: true,
        message: "Face enrolled successfully",
        data: {
          userId: user._id,
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
}
