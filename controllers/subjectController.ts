import { NextFunction, Request, Response } from "express";
import { route } from "express-extract-routes";
import { AuthMiddleware, Authenticated } from "../middleware/authMiddleware";
import { UseMiddleware } from "../middleware/useMiddleware";
import { SubjectService } from "../services/subjectService";

// Purpose: This controller class is responsible for handling subject-related requests.
@route("/subjects")
@Authenticated()
export class SubjectController {
  private subjectService: SubjectService;

  constructor() {
    this.subjectService = new SubjectService();
  }

  /**
   * @swagger
   * /subjects:
   *   post:
   *     summary: Create a new subject (Teachers and Admins only)
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - code
   *               - name
   *               - user
   *             properties:
   *               code:
   *                 type: string
   *               name:
   *                 type: string
   *               user:
   *                 type: string
   *               description:
   *                 type: string
   *               schedule:
   *                 type: object
   *                 properties:
   *                   day:
   *                     type: string
   *                   startTime:
   *                     type: string
   *                   endTime:
   *                     type: string
   *                   room:
   *                     type: string
   *               semester:
   *                 type: string
   *               instructor:
   *                 type: string
   *     responses:
   *       201:
   *         description: Subject created successfully
   *       400:
   *         description: Invalid request data
   *     tags: [Subject]
   */
  @route.post("/")
  @UseMiddleware(new AuthMiddleware().authorize("teacher", "admin"))
  async createSubject(req: Request, res: Response): Promise<Response> {
    try {
      // Set instructor to current user if teacher
      if (req.user.role === "teacher") {
        req.body.instructor = req.user.id;
      }

      const subject = await this.subjectService.createSubject(req.body);
      return res.status(201).json({
        success: true,
        data: subject,
      });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        error: {
          code: error.code || "SUBJECT_CREATE_ERROR",
          message: error.message || "Failed to create subject",
          statusCode: error.statusCode || 500,
        },
      });
    }
  }

  /**
   * @swagger
   * /subjects/{id}:
   *   get:
   *     summary: Get subject by ID
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Subject found successfully
   *       404:
   *         description: Subject not found
   *     tags: [Subject]
   */
  @route.get("/:id")
  async getSubject(req: Request, res: Response): Promise<Response> {
    try {
      const subject = await this.subjectService.getSubjectById(req.params.id);
      return res.status(200).json({
        success: true,
        data: subject,
      });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        error: {
          code: error.code || "SUBJECT_FETCH_ERROR",
          message: error.message || "Failed to fetch subject",
          statusCode: error.statusCode || 500,
        },
      });
    }
  }

  /**
   * @swagger
   * /subjects/user/{userId}:
   *   get:
   *     summary: Get subjects by user ID
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: List of subjects for the user
   *     tags: [Subject]
   */
  @route.get("/user/:userId")
  async getSubjectsByUser(req: Request, res: Response, next: NextFunction): Promise<Response> {
    try {
      const subjects = await this.subjectService.getSubjectsByUserId(req.params.userId);
      return res.status(200).json({
        success: true,
        data: subjects,
      });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        error: {
          code: error.code || "USER_SUBJECTS_FETCH_ERROR",
          message: error.message || "Failed to fetch user subjects",
          statusCode: error.statusCode || 500,
        },
      });
    }
  }

  /**
   * @swagger
   * /subjects/{id}:
   *   put:
   *     summary: Update subject (Teachers can only update their own subjects)
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               code:
   *                 type: string
   *               name:
   *                 type: string
   *               description:
   *                 type: string
   *               schedule:
   *                 type: object
   *                 properties:
   *                   day:
   *                     type: string
   *                   startTime:
   *                     type: string
   *                   endTime:
   *                     type: string
   *                   room:
   *                     type: string
   *               semester:
   *                 type: string
   *               instructor:
   *                 type: string
   *     responses:
   *       200:
   *         description: Subject updated successfully
   *       404:
   *         description: Subject not found
   *     tags: [Subject]
   */
  @route.put("/:id")
  async updateSubject(req: Request, res: Response): Promise<Response> {
    try {
      const subject = await this.subjectService.getSubjectById(req.params.id);

      // Teachers can only update their own subjects
      if (req.user.role === "teacher" && subject.instructor.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Not authorized to update this subject",
            statusCode: 403,
          },
        });
      }

      const updatedSubject = await this.subjectService.updateSubject(req.params.id, req.body);
      return res.status(200).json({
        success: true,
        data: updatedSubject,
      });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        error: {
          code: error.code || "SUBJECT_UPDATE_ERROR",
          message: error.message || "Failed to update subject",
          statusCode: error.statusCode || 500,
        },
      });
    }
  }

  /**
   * @swagger
   * /subjects/{id}:
   *   delete:
   *     summary: Delete subject (Admin only)
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       204:
   *         description: Subject deleted successfully
   *       404:
   *         description: Subject not found
   *     tags: [Subject]
   */
  @route.delete("/:id")
  @UseMiddleware(new AuthMiddleware().authorize("admin"))
  async deleteSubject(req: Request, res: Response): Promise<Response> {
    try {
      await this.subjectService.deleteSubject(req.params.id);
      return res.status(204).json({
        success: true,
        message: "Subject deleted successfully",
      });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        error: {
          code: error.code || "SUBJECT_DELETE_ERROR",
          message: error.message || "Failed to delete subject",
          statusCode: error.statusCode || 500,
        },
      });
    }
  }

  /**
   * @swagger
   * /subjects:
   *   get:
   *     summary: Get all subjects
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: List of all subjects
   *     tags: [Subject]
   */
  @route.get("/")
  async getAllSubjects(req: Request, res: Response): Promise<Response> {
    try {
      const subjects = await this.subjectService.getAllSubjects();
      return res.status(200).json({
        success: true,
        data: subjects,
      });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        error: {
          code: error.code || "SUBJECTS_FETCH_ERROR",
          message: error.message || "Failed to fetch subjects",
          statusCode: error.statusCode || 500,
        },
      });
    }
  }

  /**
   * @swagger
   * /subjects/semester/{semester}:
   *   get:
   *     summary: Get subjects by semester
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: semester
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: List of subjects for the semester
   *     tags: [Subject]
   */
  @route.get("/semester/:semester")
  async getSubjectsBySemester(req: Request, res: Response): Promise<Response> {
    try {
      const subjects = await this.subjectService.getSubjectsBySemester(req.params.semester);
      return res.status(200).json({
        success: true,
        data: subjects,
      });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        error: {
          code: error.code || "SEMESTER_SUBJECTS_FETCH_ERROR",
          message: error.message || "Failed to fetch semester subjects",
          statusCode: error.statusCode || 500,
        },
      });
    }
  }
}
