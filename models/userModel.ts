import mongoose, { Document, Schema } from "mongoose";

// Purpose: Define the user model schema
export interface UserModel extends Document {
  name: string;
  email: string;
  personId?: string;  // Luxand person ID
  role: 'student' | 'admin';
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<UserModel>(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    personId: {
      type: String,
    },
    role: {
      type: String,
      enum: ['student', 'admin'],
      default: 'student',
    },
  },
  { timestamps: true }
);

export const User = mongoose.model<UserModel>("User", UserSchema);
