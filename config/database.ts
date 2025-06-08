import mongoose from "mongoose";
import { logger } from "../helpers/logger";
import { config } from "./constants";

/**
 * Establishes a connection to the MongoDB database using Mongoose.
 * Follows MongoDB best practices with Stable API versioning and proper connection handling.
 */
const MONGODB_URI = process.env.MONGO_URI || config.DB.URI;

const mongooseOptions = {
  serverApi: {
    version: "1" as const,
    strict: true,
    deprecationErrors: true,
  },
  retryWrites: true,
  w: "majority" as const,
};

export const connectDatabase = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      logger.info("Already connected to database");
      return mongoose.connection;
    }

    await mongoose.connect(MONGODB_URI, mongooseOptions);

    await mongoose.connection.db?.admin().ping();

    logger.info(config.DB.CONNECTED);
    logger.info("Successfully pinged MongoDB deployment. Connection verified!");

    return mongoose.connection;
  } catch (error) {
    logger.error(config.DB.ERROR, error);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    throw error;
  }
};

export const disconnectDatabase = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      logger.info("Database connection closed successfully");
    }
  } catch (error) {
    logger.error("Error closing database connection:", error);
    throw error;
  }
};
