import mongoose, { Schema, Document } from "mongoose";

export interface EventModel extends Document {
  name: string;
  date: Date;
  location: string;
  type: "academic" | "examination" | "holiday" | "activity" | "meeting";
  organizerId: mongoose.Types.ObjectId;
  color?: string;
  bgColor?: string;
  createdAt: Date;
  updatedAt: Date;
}

const eventSchema = new Schema<EventModel>(
  {
    name: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    location: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["academic", "examination", "holiday", "activity", "meeting"],
      required: true,
    },
    color: {
      type: String,
      default: "#FFFFFF",
    },
    bgColor: {
      type: String,
      default: "#000000",
    },
    organizerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<EventModel>("Event", eventSchema);
