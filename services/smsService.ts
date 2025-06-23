import twilio from "twilio";
import { config } from "../config/constants";
import { StudentModel } from "../models/studentModel";
import { logger } from "../helpers/logger";

export class SMSService {
  private client?: twilio.Twilio;

  constructor() {
    if (!config.TWILIO.ACCOUNT_SID || !config.TWILIO.AUTH_TOKEN) {
      logger.warn("Twilio credentials not configured. SMS notifications will be disabled.");
      return;
    }

    this.client = twilio(config.TWILIO.ACCOUNT_SID, config.TWILIO.AUTH_TOKEN);
  }

  /**
   * Send attendance notification to guardian via voice call
   * @param student - Student object with guardian information
   * @param subjectName - Name of the subject
   * @param status - "checked-in" or "checked-out"
   * @param time - Time of attendance
   */
  async sendAttendanceNotification(
    student: StudentModel,
    subjectName: string,
    status: "checked-in" | "checked-out",
    time: Date
  ): Promise<boolean> {
    try {
      // Check if Twilio is configured
      if (!this.client || !config.TWILIO.PHONE_NUMBER) {
        logger.warn("Twilio not configured. Skipping voice notification.");
        return false;
      }

      // Check if guardian has a phone number
      if (!student.guardian?.phoneNumber) {
        logger.warn(
          `No phone number found for guardian of student ${student.firstName} ${student.lastName}`
        );
        return false;
      }

      // Format the phone number (ensure it starts with +)
      let phoneNumber = student.guardian.phoneNumber.trim();
      if (!phoneNumber.startsWith("+")) {
        // Assuming Philippines phone numbers, add +63
        phoneNumber = phoneNumber.startsWith("0")
          ? `+63${phoneNumber.slice(1)}`
          : `+63${phoneNumber}`;
      }

      // Format the time
      const formattedTime = time.toLocaleString("en-PH", {
        timeZone: "Asia/Manila",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

      // Create the voice message based on status
      const actionText = status === "checked-in" ? "checked in to" : "checked out from";
      const voiceMessage = `Hello ${student.guardian.firstName}. This is an automated call from the School Attendance System. Your child ${student.firstName} ${student.lastName} has ${actionText} ${subjectName} at ${formattedTime}. Thank you.`;

      // Make voice call with TTS
      const result = await this.client.calls.create({
        twiml: `<Response><Say voice="man" language="en-US">${voiceMessage}</Say></Response>`,
        from: config.TWILIO.PHONE_NUMBER,
        to: phoneNumber,
      });

      logger.info(
        `Voice call initiated successfully to ${phoneNumber} for student ${student.firstName} ${student.lastName}. Call SID: ${result.sid}`
      );
      return true;
    } catch (error: any) {
      logger.error(`Failed to send voice notification: ${error.message}`, {
        studentId: student._id,
        guardianPhone: student.guardian?.phoneNumber,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Send a test voice call to verify Twilio configuration
   * @param phoneNumber - Phone number to send test call to
   */
  async sendTestMessage(phoneNumber: string): Promise<boolean> {
    try {
      if (!this.client || !config.TWILIO.PHONE_NUMBER) {
        throw new Error("Twilio not configured");
      }

      // Format phone number
      let formattedPhone = phoneNumber.trim();
      if (!formattedPhone.startsWith("+")) {
        formattedPhone = formattedPhone.startsWith("0")
          ? `+63${formattedPhone.slice(1)}`
          : `+63${formattedPhone}`;
      }

      const result = await this.client.calls.create({
        twiml: `<Response><Say voice="man" language="en-US">Hello! This is a test call from the School Attendance System. Voice notifications are working correctly. Thank you.</Say></Response>`,
        from: config.TWILIO.PHONE_NUMBER,
        to: formattedPhone,
      });

      logger.info(
        `Test voice call initiated successfully to ${formattedPhone}. Call SID: ${result.sid}`
      );
      return true;
    } catch (error: any) {
      logger.error(`Failed to send test voice call: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if SMS service is configured and ready
   */
  isConfigured(): boolean {
    return !!(
      this.client &&
      config.TWILIO.PHONE_NUMBER &&
      config.TWILIO.ACCOUNT_SID &&
      config.TWILIO.AUTH_TOKEN
    );
  }
}
