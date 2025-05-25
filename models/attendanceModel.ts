import mongoose, { Schema, Document } from 'mongoose';

export interface AttendanceModel extends Document {
    userId: Schema.Types.ObjectId;
    personId: string;  // Luxand person ID
    checkInTime: Date;
    checkOutTime?: Date;
    status: 'checked-in' | 'checked-out';
    confidence: number;  // Face recognition confidence score
    createdAt: Date;
    updatedAt: Date;
}

const attendanceSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    personId: {
        type: String,
        required: true
    },
    checkInTime: {
        type: Date,
        required: true
    },
    checkOutTime: {
        type: Date
    },
    status: {
        type: String,
        enum: ['checked-in', 'checked-out'],
        default: 'checked-in'
    },
    confidence: {
        type: Number,
        required: true
    }
}, {
    timestamps: true
});

export default mongoose.model<AttendanceModel>('Attendance', attendanceSchema); 