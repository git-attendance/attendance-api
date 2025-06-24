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
    CLOUD_NAME: "attendance-dev",
    API_KEY: "862261129126219",
    API_SECRET: "Eh2EtDiOFUJLcGSikyx3WCi1HHE",
  },

  TWILIO: {
    ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || "AC597f4a549b133a27d881dccbea0596ba",
    AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || "66aeed00cd5b6a328917707674121a4e", // Fallback Auth Token
    API_KEY_SID: process.env.TWILIO_API_KEY_SID || "SK75eff577d8993cc13491cdccebbb11c9", // Your API Key SID (recommended)
    API_SECRET: process.env.TWILIO_API_SECRET || "oLatLBCuKiYw6olYACEPizhit1pMSugx", // Your API Secret (recommended)
    PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER || "+639221200563",
  },
};

// Define enums for student remarks
export enum StudentRemarks {
  EXCUSE = "excuse",
  LATE = "late",
  EARLY_DISMISSAL = "early_dismissal",
  SICK = "sick",
  FAMILY_EMERGENCY = "family_emergency",
  MEDICAL_APPOINTMENT = "medical_appointment",
  OFFICIAL_BUSINESS = "official_business",
  SUSPENSION = "suspension",
  GOOD_STANDING = "good_standing",
  NONE = "none",
}
