import mongoose, { Document, Schema } from "mongoose";

// Purpose: Define the user model schema
export interface UserModel extends Document {
  name: string;
  email: string;
  password: string;
  personId?: string; // Luxand person ID
  role: "student" | "admin" | "teacher";
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
    password: {
      type: String,
      required: true,
    },
    personId: {
      type: String,
    },
    role: {
      type: String,
      enum: ["student", "admin", "teacher"],
      default: "student",
    },
  },
  { timestamps: true }
);

export const User = mongoose.model<UserModel>("User", UserSchema);
