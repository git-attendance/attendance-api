import mongoose, { Schema, Document } from "mongoose";

export interface AttendanceModel extends Document {
  studentId: mongoose.Types.ObjectId;
  subjectId: mongoose.Types.ObjectId;
  personId: string;
  checkInTime: Date;
  checkOutTime?: Date;
  status: "checked-in" | "checked-out";
  attendanceStatus: "present" | "absent";
  confidence: number;
  createdAt: Date;
  updatedAt: Date;
}

const attendanceSchema = new Schema<AttendanceModel>(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "Student",
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
      default: "absent",
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

attendanceSchema.index({ studentId: 1, subjectId: 1 });

export default mongoose.model<AttendanceModel>("Attendance", attendanceSchema);
