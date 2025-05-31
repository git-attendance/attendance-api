import { extract } from "express-extract-routes";
//used relative path to get the controller during runtime
import { UserController } from "../controllers/userController";
import { ServerController } from "../controllers/serverController";
import { AttendanceController } from "../controllers/attendanceController";
import { SubjectController } from "../controllers/subjectController";
import { EventController } from "../controllers/eventController";

// Extract all routes from the controllers.
export const routes = extract(
  UserController,
  ServerController,
  AttendanceController,
  SubjectController,
  EventController
);
