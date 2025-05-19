// Purpose: To store all the constants used in the application.
export const config = {
  PORT: 5000,

  MESSAGE: {
    WELCOME: "You're successfully connected to ATTENDANCE API.",
  },

  DB: {
    // Create you own mongodb URI from Atlas MongoDB and use it here.
    URI: "mongodb+srv://attendance-dev:goATTENDANCE2025!@attendance-dev.vwvaihe.mongodb.net/dev?retryWrites=true&w=majority&appName=attendance-dev",
    ERROR: "Error connecting to database: ",
    NOT_INITIALIZED: "Database connection not initialized",
    CONNECTED: "Connected to database",
  },

  CLOUDINARY: {
    CLOUD_NAME: "plaque-dev",
    API_KEY: "479834719534576",
    API_SECRET: "0GgNG5UZbls7f2ecgjVbc5AcUtM",
  },
};
