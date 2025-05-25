import { AppError } from '../middleware/errorHandler';
import { AttendanceModel } from '../models/attendanceModel';
import { Subject } from '../models/subjectModel';
import { UserModel } from '../models/userModel';
import { AttendanceRepository } from '../repositories/attendanceRepository';
import { FaceRecognitionService } from './faceRecognitionService';

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
     * @param user - User attempting to check in/out
     * @param subjectId - ID of the subject for attendance
     * @param filename - Original filename of the uploaded photo
     */
    async processAttendance(
        photoBuffer: Buffer,
        user: UserModel,
        subjectId: string,
        filename: string
    ): Promise<AttendanceModel> {
        // First, verify if the subject exists
        const subject = await Subject.findById(subjectId);
        if (!subject) {
            const error = new Error('Subject not found') as any;
            error.statusCode = 404;
            error.code = 'SUBJECT_NOT_FOUND';
            throw error;
        }

        // Verify the person's face
        const verificationResult = await this.faceRecognitionService.verifyPerson(photoBuffer, "1", filename);
        
        if (!verificationResult.length) {
            const error = new Error('Face not recognized') as any;
            error.statusCode = 400;
            error.code = 'FACE_NOT_RECOGNIZED';
            throw error;
        }

        const match = verificationResult[0];
        console.log('Face verification match:', match);
        console.log('User personId:', user.personId);
        console.log('User _id:', user._id.toString());

        if (match.confidence < 0.8) {
            const error = new Error('Face verification confidence too low') as any;
            error.statusCode = 400;
            error.code = 'LOW_CONFIDENCE';
            throw error;
        }

        // Check if the name matches the user's ID (which we used as the name during enrollment)
        if (match.name !== user._id.toString()) {
            const error = new Error('Face does not match registered user') as any;
            error.statusCode = 400;
            error.code = 'FACE_MISMATCH';
            throw error;
        }

        // Get latest attendance record for the user in this subject
        const latestAttendance = await this.attendanceRepository.findLatestByUserAndSubject(
            user._id,
            subjectId
        );

        // Check current time against subject schedule
        const currentTime = new Date();
        const currentDay = currentTime.toLocaleDateString('en-US', { weekday: 'long' });
        
        if (subject.schedule.day !== currentDay) {
            const error = new Error(`No class scheduled for ${currentDay}`) as any;
            error.statusCode = 400;
            error.code = 'NO_CLASS_SCHEDULED';
            throw error;
        }

        const currentTimeStr = currentTime.toTimeString().slice(0, 5); // HH:MM format
        if (currentTimeStr < subject.schedule.startTime || currentTimeStr > subject.schedule.endTime) {
            const error = new Error('Attendance can only be marked during class hours') as any;
            error.statusCode = 400;
            error.code = 'OUTSIDE_CLASS_HOURS';
            throw error;
        }

        try {
            if (!latestAttendance || latestAttendance.status === 'checked-out') {
                // Create check-in record
                return await this.attendanceRepository.create({
                    userId: user._id,
                    subjectId: subject._id,
                    personId: user.personId,
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
            const err = new Error('Failed to process attendance record') as any;
            err.statusCode = 500;
            err.code = 'ATTENDANCE_PROCESSING_ERROR';
            throw err;
        }
    }

    /**
     * Get attendance history for a user in a specific subject
     * @param userId - ID of the user
     * @param subjectId - ID of the subject
     * @param startDate - Start date for filtering
     * @param endDate - End date for filtering
     */
    async getAttendanceHistory(
        userId: string,
        subjectId?: string,
        startDate?: Date,
        endDate?: Date
    ): Promise<AttendanceModel[]> {
        return this.attendanceRepository.getHistory(userId, subjectId, startDate, endDate);
    }

    /**
     * Get attendance statistics for a subject
     * @param subjectId - ID of the subject
     * @param startDate - Start date for statistics
     * @param endDate - End date for statistics
     */
    async getSubjectAttendanceStats(
        subjectId: string,
        startDate?: Date,
        endDate?: Date
    ) {
        const attendanceRecords = await this.attendanceRepository.getSubjectAttendance(
            subjectId,
            startDate,
            endDate
        );

        // Calculate statistics
        const totalSessions = attendanceRecords.length;
        const completeSessions = attendanceRecords.filter(record => record.status === 'checked-out').length;
        const incompleteSessions = totalSessions - completeSessions;

        return {
            totalSessions,
            completeSessions,
            incompleteSessions,
            attendanceRecords
        };
    }
} 