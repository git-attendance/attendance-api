import mongoose, { Document, Schema } from "mongoose";
import { StudentRemarks } from "../config/constants";

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
  dateOfBirth?: Date;
  personId?: string;
  guardian: {
    firstName: string;
    lastName: string;
    middleName?: string;
    email: string;
    phoneNumber?: string;
  };
  remarks?: StudentRemarks;
  color?: string;
  bgColor?: string;
  image: string;
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
    strand: {
      type: String,
    },
    dateOfBirth: {
      type: Date,
    },
    guardian: {
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
      },
      email: {
        type: String,
        required: true,
      },
      phoneNumber: {
        type: String,
      },
    },
    image: {
      type: String,
    },
    personId: {
      type: String,
    },
    remarks: {
      type: String,
      enum: Object.values(StudentRemarks),
      default: StudentRemarks.NONE,
    },
    color: {
      type: String,
      default: "#FFFFFF",
    },
    bgColor: {
      type: String,
      default: "#000000",
    },
  },
  { timestamps: true }
);

export const Student = mongoose.model<StudentModel>("Student", StudentSchema);
