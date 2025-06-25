import dotenv from "dotenv";

// Load environment variables FIRST before importing any other modules
dotenv.config();

import { createApp } from "./config/app";
import { connectDatabase } from "./config/database";
import { config } from "./config/constants";
import "reflect-metadata";
import { createServer } from "http";
import { SocketService } from "./services/socketService";

// Purpose: Start the server
const startServer = async () => {
  try {
    await connectDatabase();

    const app = createApp();
    const httpServer = createServer(app);
    const port = process.env.PORT || config.PORT;

    // Initialize socket service
    SocketService.getInstance().initialize(httpServer);

    httpServer.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  } catch (error) {
    console.log("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
