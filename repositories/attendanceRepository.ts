import Attendance, { AttendanceModel } from '../models/attendanceModel';
import { Types, FilterQuery } from 'mongoose';

export class AttendanceRepository {
    /**
     * Find the latest attendance record for a user
     * @param userId - The user's ID
     */
    async findLatestByUserId(userId: Types.ObjectId): Promise<AttendanceModel | null> {
        return Attendance.findOne({ userId }).sort({ createdAt: -1 });
    }

    /**
     * Create a new attendance record
     * @param attendanceData - The attendance data to create
     */
    async create(attendanceData: Partial<AttendanceModel>): Promise<AttendanceModel> {
        return Attendance.create(attendanceData);
    }

    /**
     * Update an existing attendance record
     * @param attendance - The attendance record to update
     */
    async update(attendance: AttendanceModel): Promise<AttendanceModel> {
        return attendance.save();
    }

    /**
     * Get attendance history for a user within a date range
     * @param userId - The user's ID
     * @param startDate - Optional start date for filtering
     * @param endDate - Optional end date for filtering
     */
    async getHistory(
        userId: Types.ObjectId | string,
        startDate?: Date,
        endDate?: Date
    ): Promise<AttendanceModel[]> {
        const query: FilterQuery<AttendanceModel> = { userId };
        
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = startDate;
            if (endDate) query.createdAt.$lte = endDate;
        }

        return Attendance.find(query).sort({ createdAt: -1 });
    }

    /**
     * Get attendance records by multiple criteria
     * @param filter - The filter criteria
     */
    async findByFilter(filter: FilterQuery<AttendanceModel>): Promise<AttendanceModel[]> {
        return Attendance.find(filter);
    }
} 