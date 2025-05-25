import { Request, Response, NextFunction } from "express";
import { logger } from "../helpers/logger";

// Purpose: Custom error handler middleware
export class AppError extends Error {
  statusCode: number;
  code?: string;

  constructor(message: string, statusCode: number, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

// Not found route handler
export const notFound = (_req: Request, _res: Response, next: NextFunction): void => {
  const error = new AppError("Not found", 404, "RESOURCE_NOT_FOUND");
  next(error);
};

// Error handler middleware
export const errorHandler = (err: Error, _req: Request, res: Response): void => {
  logger.error(err.message);

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code || `ERR_${err.statusCode}`,
        message: err.message,
        statusCode: err.statusCode,
        stack: process.env.NODE_ENV === "production" ? undefined : err.stack?.split("\n").map((msg) => msg.trim())
      }
    });
  } else {
    res.status(500).json({
      success: false,
      error: {
        code: "ERR_INTERNAL_SERVER",
        message: "Internal server error",
        statusCode: 500,
        stack: process.env.NODE_ENV === "production" ? undefined : err.stack?.split("\n").map((msg) => msg.trim())
      }
    });
  }
};
