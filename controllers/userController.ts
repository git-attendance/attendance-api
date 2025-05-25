import { Request, Response, NextFunction } from "express";
import { UserService } from "../services/userService";
import { AuthService } from "../services/authService";
import { CloudinaryService } from "../services/cloudinaryService";
import { upload } from "../middleware/multer";
import { route } from "express-extract-routes";
import { UseMiddleware } from "../middleware/useMiddleware";
import { AuthMiddleware, Authenticated } from "../middleware/authMiddleware";

// Purpose: This controller class is responsible for handling the user related requests.
@route("/user")
@Authenticated({
  publicRoutes: ["/register", "/login", "/logout"],
})
export class UserController {
  private userService: UserService;
  private authService: AuthService;
  private cloudinaryService: CloudinaryService;
  private authMiddleware: AuthMiddleware;

  constructor() {
    this.userService = new UserService();
    this.authService = new AuthService();
    this.cloudinaryService = new CloudinaryService();
    this.authMiddleware = new AuthMiddleware();
  }

  /**
   * @swagger
   * /user/register:
   *   post:
   *     summary: Register a new user
   */
  @route.post("/register")
  async register(req: Request, res: Response): Promise<Response> {
    try {
      const { user, token } = await this.authService.register(req.body);

      // Set cookie
      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      });

      // Return response without sensitive data
      return res.status(201).json({
        success: true,
        data: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        message: "User registered successfully",
      });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        error: {
          code: error.code || "REGISTRATION_ERROR",
          message: error.message || "Failed to register user",
          statusCode: error.statusCode || 500,
        },
      });
    }
  }

  /**
   * @swagger
   * /user/login:
   *   post:
   *     summary: Login user
   *     responses:
   *       200:
   *         description: Login successful
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
   *                     user:
   *                       type: object
   *                     token:
   *                       type: string
   *                       description: JWT token for authentication
   */
  @route.post("/login")
  async login(req: Request, res: Response): Promise<Response> {
    try {
      const { email, password, role } = req.body;
      const { user, token } = await this.authService.login(email, password, role);

      // Set cookie with token
      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      });

      return res.status(200).json({
        success: true,
        data: {
          user,
          token,
        },
        message: "Logged in successfully",
      });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        error: {
          code: error.code || "LOGIN_ERROR",
          message: error.message || "Failed to login",
          statusCode: error.statusCode || 500,
        },
      });
    }
  }

  /**
   * @swagger
   * /user/logout:
   *   post:
   *     summary: Logout user
   */
  @route.post("/logout")
  async logout(_req: Request, res: Response): Promise<Response> {
    res.cookie("token", "", {
      httpOnly: true,
      expires: new Date(0),
    });

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  }

  /**
   * @swagger
   * /user/get/{id}:
   *   get:
   *     summary: Get a user by ID
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: The user ID
   *     responses:
   *       200:
   *         description: The user data
   *       404:
   *         description: User not found
   */
  @route.get("/get/:id")
  async getUser(req: Request, res: Response): Promise<Response> {
    try {
      const user = await this.userService.getUser(req.params.id);
      return res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        error: {
          code: error.code || "USER_FETCH_ERROR",
          message: error.message || "Failed to fetch user",
          statusCode: error.statusCode || 500,
        },
      });
    }
  }

  /**
   * @swagger
   * /user/get/all:
   *   get:
   *     summary: Get all users (Admin only)
   */
  @route.get("/get/all")
  @UseMiddleware(new AuthMiddleware().authorize("admin", "teacher"))
  async getUsers(_req: Request, res: Response): Promise<Response> {
    try {
      const users = await this.userService.getUsers();
      return res.status(200).json({
        success: true,
        data: users,
      });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        error: {
          code: error.code || "USERS_FETCH_ERROR",
          message: error.message || "Failed to fetch users",
          statusCode: error.statusCode || 500,
        },
      });
    }
  }

  /**
   * @swagger
   * /user/create:
   *   post:
   *     summary: Create a new user
   *     requestBody:
   *      required: true
   *      content:
   *        application/json:
   *          schema:
   *            type: object
   *            properties:
   *              username:
   *                type: string
   *              email:
   *                type: string
   *              password:
   *                type: string
   *     responses:
   *       201:
   *         description: User created successfully
   *       400:
   *         description: Invalid request data
   */
  @route.post("/create")
  create = async (req: Request, res: Response, next: NextFunction): Promise<Response> => {
    try {
      const user = await this.userService.createUser(req.body);
      return res.status(201).json({
        success: true,
        data: user,
        message: "User created successfully",
      });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        error: {
          code: error.code || "USER_CREATE_ERROR",
          message: error.message || "Failed to create user",
          statusCode: error.statusCode || 500,
        },
      });
    }
  };

  /**
   * @swagger
   * /user/update:
   *   put:
   *     summary: Update user
   */
  @route.put("/update")
  async update(req: Request, res: Response): Promise<Response> {
    try {
      // Only allow users to update their own profile unless admin
      if (req.user.role !== "admin" && req.user.id !== req.body._id) {
        return res.status(403).json({
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Not authorized to update this user",
            statusCode: 403,
          },
        });
      }

      const user = await this.userService.updateUser(req.body);
      return res.status(200).json({
        success: true,
        data: user,
        message: "User updated successfully",
      });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        error: {
          code: error.code || "USER_UPDATE_ERROR",
          message: error.message || "Failed to update user",
          statusCode: error.statusCode || 500,
        },
      });
    }
  }

  /**
   * @swagger
   * /user/delete/{id}:
   *   delete:
   *     summary: Delete user (Admin only)
   */
  @route.delete("/delete/:id")
  @UseMiddleware(new AuthMiddleware().authorize("admin"))
  async delete(req: Request, res: Response): Promise<Response> {
    try {
      await this.userService.deleteUser(req.params.id);
      return res.status(200).json({
        success: true,
        message: "User deleted successfully",
      });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        error: {
          code: error.code || "USER_DELETE_ERROR",
          message: error.message || "Failed to delete user",
          statusCode: error.statusCode || 500,
        },
      });
    }
  }

  /**
   * @swagger
   * /user/search:
   *   post:
   *     summary: Search for a user
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               query:
   *                 type: string
   *                 description: The search query
   *     responses:
   *       200:
   *         description: The user data
   *       404:
   *         description: User not found
   */
  @route.post("/search")
  search = async (req: Request, res: Response, next: NextFunction): Promise<Response> => {
    try {
      const user = await this.userService.searchUser(req.body);
      return res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        error: {
          code: error.code || "USER_SEARCH_ERROR",
          message: error.message || "Failed to search user",
          statusCode: error.statusCode || 500,
        },
      });
    }
  };

  /**
   * @swagger
   * /user/upload-image/{id}:
   *   post:
   *     summary: Upload user profile image
   */
  @route.post("/upload-image/:id")
  @UseMiddleware(upload.single("image"))
  async uploadImage(req: Request, res: Response): Promise<Response> {
    try {
      // Only allow users to upload their own image unless admin
      if (req.user.role !== "admin" && req.user.id !== req.params.id) {
        return res.status(403).json({
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Not authorized to upload image for this user",
            statusCode: 403,
          },
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: {
            code: "NO_IMAGE_PROVIDED",
            message: "Please upload an image",
            statusCode: 400,
          },
        });
      }

      const imageUrl = await this.cloudinaryService.uploadImage(req.file);
      const updateData = {
        _id: req.params.id,
        avatar: imageUrl,
      };

      const user = await this.userService.updateUser(updateData);
      return res.status(200).json({
        success: true,
        data: user,
        message: "Profile image uploaded successfully",
      });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        error: {
          code: error.code || "IMAGE_UPLOAD_ERROR",
          message: error.message || "Failed to upload profile image",
          statusCode: error.statusCode || 500,
        },
      });
    }
  }
}
