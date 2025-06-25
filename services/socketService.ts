import { Server as SocketIOServer } from "socket.io";
import { Server as HTTPServer } from "http";

export class SocketService {
  private static instance: SocketService;
  private io: SocketIOServer | null = null;

  private constructor() {}

  static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  initialize(server: HTTPServer): void {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.CLIENT_URL || "*",
        methods: ["GET", "POST"],
      },
    });

    this.io.on("connection", (socket) => {
      console.log("Client connected:", socket.id);

      socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
      });
    });
  }

  // Emit attendance update to all connected clients
  emitAttendanceUpdate(data: {
    studentId: any;
    subjectId: any;
    status: string;
    attendanceStatus: string;
    checkInTime?: Date;
    checkOutTime?: Date;
  }): void {
    if (this.io) {
      this.io.emit("attendance:update", data);
    }
  }
}
