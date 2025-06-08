import { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/authService";

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

// Class decorator for authentication
export function Authenticated(options: { publicRoutes?: string[] } = {}) {
  return function (constructor: Function) {
    const originalRoutes = constructor.prototype;
    Object.getOwnPropertyNames(originalRoutes).forEach((method) => {
      if (method !== "constructor") {
        const descriptor = Object.getOwnPropertyDescriptor(originalRoutes, method);
        if (descriptor && typeof descriptor.value === "function") {
          const originalMethod = descriptor.value;
          descriptor.value = async function (req: Request, res: Response, next: NextFunction) {
            try {
              // Skip authentication for public routes
              const isPublicRoute = options.publicRoutes?.some((route) => req.path.endsWith(route));

              if (isPublicRoute) {
                return originalMethod.apply(this, [req, res, next]);
              }

              const authService = new AuthService();
              
              // Get token from Authorization header
              const authHeader = req.headers.authorization;
              if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({
                  success: false,
                  error: {
                    code: "NO_TOKEN",
                    message: "Authentication required. Please provide a Bearer token.",
                    statusCode: 401,
                  },
                });
              }

              // Extract the token
              const token = authHeader.split(' ')[1];
              
              if (!token) {
                return res.status(401).json({
                  success: false,
                  error: {
                    code: "NO_TOKEN",
                    message: "Authentication required",
                    statusCode: 401,
                  },
                });
              }

              const decoded = authService.verifyToken(token);
              req.user = decoded;
              return originalMethod.apply(this, [req, res, next]);
            } catch (error: any) {
              return res.status(401).json({
                success: false,
                error: {
                  code: error.code || "AUTH_ERROR",
                  message: error.message || "Authentication failed",
                  statusCode: 401,
                },
              });
            }
          };
          Object.defineProperty(originalRoutes, method, descriptor);
        }
      }
    });
  };
}

export class AuthMiddleware {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  authorize = (...roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: {
            code: "NO_USER",
            message: "Authentication required",
            statusCode: 401,
          },
        });
      }

      if (!roles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Not authorized to access this route",
            statusCode: 403,
          },
        });
      }

      next();
    };
  };
}
