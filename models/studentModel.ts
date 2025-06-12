import mongoose, { Document, Schema } from "mongoose";

// Purpose: Define the user model schema
export interface StudentModel extends Document {
  firstName: string;
  lastName: string;
  middleName?: string;
  studentId: string;
  gradeLevel: string;
  section: string;
  strand: string;
  email: string;
  personId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const StudentSchema = new Schema<StudentModel>(
  {
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    middleName: {
      type: String,
      required: true,
    },
    studentId: {
      type: String,
    },
    gradeLevel: {
      type: String,
    },
    section: {
      type: String,
    },
    email: {
      type: String,
      required: true,
    },
    personId: {
      type: String,
    },
  },
  { timestamps: true }
);

export const Student = mongoose.model<StudentModel>("Student", StudentSchema);
