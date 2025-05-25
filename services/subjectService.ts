import { SubjectModel } from '../models/subjectModel';
import { SubjectRepository } from '../repositories/subjectRepository';
import { UserRepository } from '../repositories/userRepository';
import { AppError } from '../middleware/errorHandler';

export class SubjectService {
    private subjectRepository: SubjectRepository;
    private userRepository: UserRepository;

    constructor() {
        this.subjectRepository = new SubjectRepository();
        this.userRepository = new UserRepository();
    }

    /**
     * Create a new subject
     * @param subjectData - Subject data
     */
    async createSubject(subjectData: Partial<SubjectModel>): Promise<SubjectModel> {
        try {
            // Validate required fields
            if (!subjectData.code || !subjectData.name || !subjectData.instructor) {
                const error = new Error('Missing required fields') as any;
                error.statusCode = 400;
                error.code = 'MISSING_REQUIRED_FIELDS';
                throw error;
            }

            // Verify instructor exists and is a teacher
            try {
                await this.userRepository.findTeacherById(subjectData.instructor);
            } catch (err: any) {
                const error = new Error(err.message) as any;
                error.statusCode = err.statusCode || 400;
                error.code = err.code || 'INVALID_INSTRUCTOR';
                throw error;
            }

            // Validate schedule times
            if (subjectData.schedule) {
                const { startTime, endTime } = subjectData.schedule;
                if (startTime && endTime && startTime >= endTime) {
                    const error = new Error('Start time must be before end time') as any;
                    error.statusCode = 400;
                    error.code = 'INVALID_SCHEDULE_TIME';
                    throw error;
                }
            }

            return await this.subjectRepository.create(subjectData);
        } catch (error: any) {
            if (error.statusCode) throw error;
            
            const err = new Error('Failed to create subject') as any;
            err.statusCode = 500;
            err.code = 'SUBJECT_CREATE_ERROR';
            throw err;
        }
    }

    /**
     * Get subject by ID
     * @param id - Subject ID
     */
    async getSubjectById(id: string): Promise<SubjectModel> {
        const subject = await this.subjectRepository.findById(id);
        if (!subject) {
            const error = new Error('Subject not found') as any;
            error.statusCode = 404;
            error.code = 'SUBJECT_NOT_FOUND';
            throw error;
        }
        return subject;
    }

    /**
     * Get subjects by user ID (either as instructor or through attendance)
     * @param userId - User ID
     */
    async getSubjectsByUserId(userId: string): Promise<SubjectModel[]> {
        try {
            return await this.subjectRepository.findByUserId(userId);
        } catch (error) {
            const err = new Error('Failed to fetch user subjects') as any;
            err.statusCode = 500;
            err.code = 'USER_SUBJECTS_FETCH_ERROR';
            throw err;
        }
    }

    /**
     * Update subject
     * @param id - Subject ID
     * @param updateData - Updated subject data
     */
    async updateSubject(id: string, updateData: Partial<SubjectModel>): Promise<SubjectModel> {
        try {
            // If instructor is being updated, verify they are a teacher
            if (updateData.instructor) {
                try {
                    await this.userRepository.findTeacherById(updateData.instructor);
                } catch (err: any) {
                    const error = new Error(err.message) as any;
                    error.statusCode = err.statusCode || 400;
                    error.code = err.code || 'INVALID_INSTRUCTOR';
                    throw error;
                }
            }

            // Validate schedule times if provided
            if (updateData.schedule) {
                const { startTime, endTime } = updateData.schedule;
                if (startTime && endTime && startTime >= endTime) {
                    const error = new Error('Start time must be before end time') as any;
                    error.statusCode = 400;
                    error.code = 'INVALID_SCHEDULE_TIME';
                    throw error;
                }
            }

            const updatedSubject = await this.subjectRepository.update(id, updateData);
            if (!updatedSubject) {
                const error = new Error('Subject not found') as any;
                error.statusCode = 404;
                error.code = 'SUBJECT_NOT_FOUND';
                throw error;
            }
            return updatedSubject;
        } catch (error: any) {
            if (error.statusCode) throw error;
            
            const err = new Error('Failed to update subject') as any;
            err.statusCode = 500;
            err.code = 'SUBJECT_UPDATE_ERROR';
            throw err;
        }
    }

    /**
     * Delete subject
     * @param id - Subject ID
     */
    async deleteSubject(id: string): Promise<void> {
        const result = await this.subjectRepository.delete(id);
        if (!result) {
            const error = new Error('Subject not found') as any;
            error.statusCode = 404;
            error.code = 'SUBJECT_NOT_FOUND';
            throw error;
        }
    }

    /**
     * Get all subjects
     */
    async getAllSubjects(): Promise<SubjectModel[]> {
        try {
            return await this.subjectRepository.findAll();
        } catch (error) {
            const err = new Error('Failed to fetch subjects') as any;
            err.statusCode = 500;
            err.code = 'SUBJECTS_FETCH_ERROR';
            throw err;
        }
    }

    /**
     * Get subjects by semester
     * @param semester - Semester
     */
    async getSubjectsBySemester(semester: string): Promise<SubjectModel[]> {
        try {
            return await this.subjectRepository.findBySemester(semester);
        } catch (error) {
            const err = new Error('Failed to fetch semester subjects') as any;
            err.statusCode = 500;
            err.code = 'SEMESTER_SUBJECTS_FETCH_ERROR';
            throw err;
        }
    }

    /**
     * Get subjects by instructor ID
     * @param instructorId - ID of the instructor
     */
    async getSubjectsByInstructor(instructorId: string): Promise<SubjectModel[]> {
        try {
            // Verify the instructor exists and is a teacher before fetching their subjects
            await this.userRepository.findTeacherById(instructorId);
            return await this.subjectRepository.findByInstructor(instructorId);
        } catch (error: any) {
            if (error.statusCode) throw error;
            
            const err = new Error('Failed to fetch instructor subjects') as any;
            err.statusCode = 500;
            err.code = 'INSTRUCTOR_SUBJECTS_FETCH_ERROR';
            throw err;
        }
    }
} 