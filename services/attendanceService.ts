import { FaceRecognitionService } from './faceRecognitionService';
import { AttendanceModel } from '../models/attendanceModel';
import { AppError } from '../middleware/errorHandler';
import { UserModel } from '../models/userModel';
import { AttendanceRepository } from '../repositories/attendanceRepository';

export class AttendanceService {
    private faceRecognitionService: FaceRecognitionService;
    private attendanceRepository: AttendanceRepository;

    constructor() {
        this.faceRecognitionService = new FaceRecognitionService();
        this.attendanceRepository = new AttendanceRepository();
    }

    /**
     * Process attendance using face recognition
     * @param photoBuffer - Buffer of the photo to verify
     * @param user - User attempting to check in/out
     * @param filename - Original filename of the uploaded photo
     */
    async processAttendance(
        photoBuffer: Buffer,
        user: UserModel,
        filename: string
    ): Promise<AttendanceModel> {
        try {
            // Verify the person's face
            const verificationResult = await this.faceRecognitionService.verifyPerson(photoBuffer, "1", filename);
            
            if (!verificationResult.length) {
                throw new AppError('Face not recognized', 400);
            }

            const match = verificationResult[0];
            console.log('Face verification match:', match);
            console.log('User personId:', user.personId);
            console.log('User _id:', user._id.toString());

            if (match.confidence < 0.8) { // You can adjust this threshold
                throw new AppError('Face verification confidence too low', 400);
            }

            // Check if the name matches the user's ID (which we used as the name during enrollment)
            if (match.name !== user._id.toString()) {
                throw new AppError('Face does not match registered user', 400);
            }

            // Get latest attendance record for the user
            const latestAttendance = await this.attendanceRepository.findLatestByUserId(user._id);

            if (!latestAttendance || latestAttendance.status === 'checked-out') {
                // Create check-in record
                return await this.attendanceRepository.create({
                    userId: user._id,
                    personId: user.personId, // Use the stored personId from enrollment
                    checkInTime: new Date(),
                    status: 'checked-in',
                    confidence: match.confidence
                });
            } else {
                // Update existing record with check-out
                latestAttendance.checkOutTime = new Date();
                latestAttendance.status = 'checked-out';
                return await this.attendanceRepository.update(latestAttendance);
            }
        } catch (error) {
            console.error('Attendance processing error:', error);
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Attendance processing failed', 500);
        }
    }

    /**
     * Get attendance history for a user
     * @param userId - ID of the user
     * @param startDate - Start date for filtering
     * @param endDate - End date for filtering
     */
    async getAttendanceHistory(
        userId: string,
        startDate?: Date,
        endDate?: Date
    ): Promise<AttendanceModel[]> {
        return this.attendanceRepository.getHistory(userId, startDate, endDate);
    }
} 