import mongoose, { Schema, Document } from "mongoose";

export interface AttendanceModel extends Document {
  userId: mongoose.Types.ObjectId;
  subjectId: mongoose.Types.ObjectId; // Reference to the subject
  personId: string; // Luxand person ID
  checkInTime: Date;
  checkOutTime?: Date;
  status: "checked-in" | "checked-out";
  attendanceStatus: "present" | "absent"; // New field for tracking attendance status
  confidence: number; // Face recognition confidence score
  createdAt: Date;
  updatedAt: Date;
}

const attendanceSchema = new Schema<AttendanceModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    subjectId: {
      type: Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },
    personId: {
      type: String,
      required: true,
    },
    checkInTime: {
      type: Date,
      required: true,
    },
    checkOutTime: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["checked-in", "checked-out"],
      required: true,
    },
    attendanceStatus: {
      type: String,
      enum: ["present", "absent"],
      default: "absent", // Default value set to absent
      required: true,
    },
    confidence: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Create a compound index for userId and subjectId
attendanceSchema.index({ userId: 1, subjectId: 1 });

export default mongoose.model<AttendanceModel>("Attendance", attendanceSchema);
