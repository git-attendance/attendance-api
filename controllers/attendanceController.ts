import { Request, Response, NextFunction } from 'express';
import { AttendanceService } from '../services/attendanceService';
import { AppError } from '../middleware/errorHandler';
import { User } from '../models/userModel';
import { route } from 'express-extract-routes';
import { UseMiddleware } from '../middleware/useMiddleware';
import { upload } from '../middleware/multer';
import { FaceRecognitionService } from '../services/faceRecognitionService';

// Purpose: This controller class is responsible for handling attendance-related requests.
@route('/attendance')
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
     *     summary: Process attendance (check-in/check-out)
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
     *         description: Attendance processed successfully
     *       400:
     *         description: Invalid request or face verification failed
     *       404:
     *         description: User not found
     */
    @route.post('/process')
    @UseMiddleware(upload.single('photo'))
    async processAttendance(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.file) {
                throw new AppError('No photo provided', 400);
            }

            const user = await User.findById(req.body.userId);
            if (!user) {
                throw new AppError('User not found', 404);
            }

            const attendance = await this.attendanceService.processAttendance(
                req.file.buffer,
                user,
                req.file.originalname
            );

            res.status(200).json({
                success: true,
                data: attendance,
                message: `Successfully ${attendance.status === 'checked-in' ? 'checked in' : 'checked out'}`
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * @swagger
     * /attendance/history:
     *   get:
     *     summary: Get attendance history
     *     parameters:
     *       - in: query
     *         name: userId
     *         required: true
     *         schema:
     *           type: string
     *         description: The user ID
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
     */
    @route.get('/history')
    getAttendanceHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { userId, startDate, endDate } = req.query;

            if (!userId) {
                throw new AppError('User ID is required', 400);
            }

            const history = await this.attendanceService.getAttendanceHistory(
                userId as string,
                startDate ? new Date(startDate as string) : undefined,
                endDate ? new Date(endDate as string) : undefined
            );

            res.status(200).json({
                success: true,
                data: history
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * @swagger
     * /attendance/enroll:
     *   post:
     *     summary: Enroll a user's face in the system
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
     */
    @route.post('/enroll')
    @UseMiddleware(upload.single('photo'))
    async enrollUserFace(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.file) {
                throw new AppError('No photo provided', 400);
            }

            const user = await User.findById(req.body.userId);
            if (!user) {
                throw new AppError('User not found', 404);
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
            user.personId = enrollmentResult.id; // This is now the UUID from Luxand
            await user.save();

            // Verify the user was updated successfully
            const updatedUser = await User.findById(user._id);
            if (!updatedUser || !updatedUser.personId) {
                throw new AppError('Failed to save person ID to user record', 500);
            }

            res.status(200).json({
                success: true,
                message: 'Face enrolled successfully',
                data: {
                    userId: user._id,
                    personId: enrollmentResult.id,
                    faces: enrollmentResult.faces
                }
            });
        } catch (error) {
            console.error('Face enrollment error:', error);
            next(error);
        }
    }
} 