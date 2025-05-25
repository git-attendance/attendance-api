import { Subject, SubjectModel } from '../models/subjectModel';
import { AppError } from '../middleware/errorHandler';
import { Types, FilterQuery } from 'mongoose';

export class SubjectRepository {
    /**
     * Create a new subject
     * @param data - Subject data
     */
    async create(data: Partial<SubjectModel>): Promise<SubjectModel> {
        try {
            return await Subject.create(data);
        } catch (error: any) {
            if (error.code === 11000) {
                throw new AppError('Subject code already exists', 400);
            }
            throw new AppError('Failed to create subject', 500);
        }
    }

    /**
     * Find subject by ID
     * @param id - Subject ID
     */
    async findById(id: string): Promise<SubjectModel | null> {
        try {
            return await Subject.findById(id).populate('instructor', 'name email');
        } catch (error) {
            throw new AppError('Failed to find subject', 500);
        }
    }

    /**
     * Find subjects by user ID
     * @param userId - User ID
     */
    async findByUserId(userId: string): Promise<SubjectModel[]> {
        try {
            return await Subject.find({ instructor: userId }).populate('instructor', 'name email');
        } catch (error) {
            throw new AppError('Failed to find subjects', 500);
        }
    }

    /**
     * Update subject
     * @param id - Subject ID
     * @param data - Updated subject data
     */
    async update(id: string, data: Partial<SubjectModel>): Promise<SubjectModel | null> {
        try {
            return await Subject.findByIdAndUpdate(
                id,
                { $set: data },
                { new: true, runValidators: true }
            ).populate('instructor', 'name email');
        } catch (error: any) {
            if (error.code === 11000) {
                throw new AppError('Subject code already exists', 400);
            }
            throw new AppError('Failed to update subject', 500);
        }
    }

    /**
     * Delete subject
     * @param id - Subject ID
     */
    async delete(id: string): Promise<SubjectModel | null> {
        try {
            return await Subject.findByIdAndDelete(id);
        } catch (error) {
            throw new AppError('Failed to delete subject', 500);
        }
    }

    /**
     * Find all subjects
     */
    async findAll(): Promise<SubjectModel[]> {
        try {
            return await Subject.find().populate('instructor', 'name email');
        } catch (error) {
            throw new AppError('Failed to fetch subjects', 500);
        }
    }

    /**
     * Find subjects by semester
     * @param semester - Semester
     */
    async findBySemester(semester: string): Promise<SubjectModel[]> {
        try {
            return await Subject.find({ semester }).populate('instructor', 'name email');
        } catch (error) {
            throw new AppError('Failed to fetch subjects by semester', 500);
        }
    }

    /**
     * Find subjects by instructor ID
     * @param instructorId - ID of the instructor
     */
    async findByInstructor(instructorId: string): Promise<SubjectModel[]> {
        try {
            return await Subject.find({ instructor: instructorId }).populate('instructor', 'name email');
        } catch (error) {
            throw new AppError('Failed to fetch subjects by instructor', 500);
        }
    }
} 