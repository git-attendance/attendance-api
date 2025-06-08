import mongoose, { Document, Schema } from "mongoose";

// Purpose: Define the subject model schema
export interface SubjectModel extends Document {
  code: string;           // Subject code (e.g., "MATH101")
  name: string;          // Subject name (e.g., "Introduction to Calculus")
  description: string;   // Subject description
  schedule: {
    day: string;        // Day of the week
    startTime: string;  // Start time of the class
    endTime: string;    // End time of the class
    room: string;       // Room/venue of the class
  };
  semester: string;     // Current semester (e.g., "Fall 2024")
  instructor: mongoose.Types.ObjectId;   // Reference to User model (teacher)
  createdAt: Date;
  updatedAt: Date;
}

const SubjectSchema = new Schema<SubjectModel>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    schedule: {
      day: {
        type: String,
        required: true,
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      },
      startTime: {
        type: String,
        required: true,
      },
      endTime: {
        type: String,
        required: true,
      },
      room: {
        type: String,
        required: true,
      },
    },
    semester: {
      type: String,
      required: true,
    },
    instructor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

export const Subject = mongoose.model<SubjectModel>("Subject", SubjectSchema);
