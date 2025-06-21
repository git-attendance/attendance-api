import { Request, Response } from "express";
import { route } from "express-extract-routes";
import { AuthMiddleware, Authenticated } from "../middleware/authMiddleware";
import { UseMiddleware } from "../middleware/useMiddleware";
import { StudentService } from "../services/studentService";
import { CloudinaryService } from "../services/cloudinaryService";
import { upload } from "../middleware/multer";

// Purpose: This controller class is responsible for handling the student related requests.
@route("/student")
@Authenticated({
  publicRoutes: [],
})
export class StudentController {
  private studentService: StudentService;
  private authMiddleware: AuthMiddleware;
  private cloudinaryService: CloudinaryService;

  constructor() {
    this.studentService = new StudentService();
    this.authMiddleware = new AuthMiddleware();
    this.cloudinaryService = new CloudinaryService();
  }

  /**
   * @swagger
   * /student/{id}:
   *   get:
   *     summary: Get a student by ID
   *     tags: [Student]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: The student ID
   *     responses:
   *       200:
   *         description: The student data
   *       404:
   *         description: Student not found
   */
  @route.get("/:id")
  async getStudent(req: Request, res: Response): Promise<Response> {
    try {
      const student = await this.studentService.getStudent(req.params.id);
      return res.status(200).json({
        success: true,
        data: student,
      });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        error: {
          code: error.code || "STUDENT_FETCH_ERROR",
          message: error.message || "Failed to fetch student",
          statusCode: error.statusCode || 500,
        },
      });
    }
  }

  /**
   * @swagger
   * /student:
   *   get:
   *     summary: Get all students (Admin and Teacher only)
   *     tags: [Student]
   */
  @route.get("/")
  @UseMiddleware(new AuthMiddleware().authorize("admin", "teacher"))
  async getStudents(_req: Request, res: Response): Promise<Response> {
    try {
      const students = await this.studentService.getStudents();
      return res.status(200).json({
        success: true,
        data: students,
      });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        error: {
          code: error.code || "STUDENTS_FETCH_ERROR",
          message: error.message || "Failed to fetch students",
          statusCode: error.statusCode || 500,
        },
      });
    }
  }

  /**
   * @swagger
   * /student:
   *   post:
   *     summary: Create a new student
   *     tags: [Student]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               firstName:
   *                 type: string
   *               lastName:
   *                 type: string
   *               middleName:
   *                 type: string
   *               email:
   *                 type: string
   *               studentId:
   *                 type: string
   *               gradeLevel:
   *                 type: string
   *               section:
   *                 type: string
   *               strand:
   *                 type: string
   *     responses:
   *       201:
   *         description: Student created successfully
   *       400:
   *         description: Invalid request data
   */
  @route.post("/")
  @UseMiddleware(new AuthMiddleware().authorize("admin", "teacher"))
  async create(req: Request, res: Response): Promise<Response> {
    try {
      const student = await this.studentService.createStudent(req.body);
      return res.status(201).json({
        success: true,
        data: student,
        message: "Student created successfully",
      });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        error: {
          code: error.code || "STUDENT_CREATE_ERROR",
          message: error.message || "Failed to create student",
          statusCode: error.statusCode || 500,
        },
      });
    }
  }

  /**
   * @swagger
   * /student:
   *   put:
   *     summary: Update student
   *     tags: [Student]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               firstName:
   *                 type: string
   *               lastName:
   *                 type: string
   *               middleName:
   *                 type: string
   *               email:
   *                 type: string
   *               studentId:
   *                 type: string
   *               gradeLevel:
   *                 type: string
   *               section:
   *                 type: string
   *               strand:
   *                 type: string
   *     responses:
   *       200:
   *         description: Student updated successfully
   */
  @route.put("/")
  @UseMiddleware(new AuthMiddleware().authorize("admin", "teacher"))
  async update(req: Request, res: Response): Promise<Response> {
    try {
      const student = await this.studentService.updateStudent(req.body);
      return res.status(200).json({
        success: true,
        data: student,
        message: "Student updated successfully",
      });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        error: {
          code: error.code || "STUDENT_UPDATE_ERROR",
          message: error.message || "Failed to update student",
          statusCode: error.statusCode || 500,
        },
      });
    }
  }

  /**
   * @swagger
   * /student/{id}:
   *   delete:
   *     summary: Delete student (Admin only)
   *     tags: [Student]
   */
  @route.delete("/:id")
  @UseMiddleware(new AuthMiddleware().authorize("admin"))
  async delete(req: Request, res: Response): Promise<Response> {
    try {
      await this.studentService.deleteStudent(req.params.id);
      return res.status(200).json({
        success: true,
        message: "Student deleted successfully",
      });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        error: {
          code: error.code || "STUDENT_DELETE_ERROR",
          message: error.message || "Failed to delete student",
          statusCode: error.statusCode || 500,
        },
      });
    }
  }

  /**
   * @swagger
   * /student/search:
   *   post:
   *     summary: Search for a student
   *     tags: [Student]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               query:
   *                 type: object
   *                 description: The search query object
   *     responses:
   *       200:
   *         description: The student data
   *       404:
   *         description: Student not found
   */
  @route.post("/search")
  @UseMiddleware(new AuthMiddleware().authorize("admin", "teacher"))
  async search(req: Request, res: Response): Promise<Response> {
    try {
      const student = await this.studentService.searchStudent(req.body);
      return res.status(200).json({
        success: true,
        data: student,
      });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        error: {
          code: error.code || "STUDENT_SEARCH_ERROR",
          message: error.message || "Failed to search student",
          statusCode: error.statusCode || 500,
        },
      });
    }
  }

  /**
   * @swagger
   * /student/{id}/upload-image:
   *   post:
   *     summary: Upload student image
   *     tags: [Student]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: The student ID
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             properties:
   *               image:
   *                 type: string
   *                 format: binary
   *                 description: Image file to upload
   *     responses:
   *       200:
   *         description: Image uploaded successfully
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
   *                     imageUrl:
   *                       type: string
   *                     student:
   *                       type: object
   *                 message:
   *                   type: string
   *       400:
   *         description: Invalid file or student ID
   *       404:
   *         description: Student not found
   */
  @route.post("/:id/upload-image")
  @UseMiddleware(upload.single("image"))
  @UseMiddleware(new AuthMiddleware().authorize("admin", "teacher"))
  async uploadImage(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: {
            code: "NO_FILE_PROVIDED",
            message: "Please provide an image file",
            statusCode: 400,
          },
        });
      }

      // Upload image to Cloudinary
      const imageUrl = await this.cloudinaryService.uploadImage(req.file);

      // Update student with new image URL
      const updatedStudent = await this.studentService.updateStudent({
        _id: id,
        image: imageUrl,
      });

      return res.status(200).json({
        success: true,
        data: {
          imageUrl,
          student: updatedStudent,
        },
        message: "Image uploaded successfully",
      });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        error: {
          code: error.code || "IMAGE_UPLOAD_ERROR",
          message: error.message || "Failed to upload image",
          statusCode: error.statusCode || 500,
        },
      });
    }
  }
}
