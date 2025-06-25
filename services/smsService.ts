import twilio from "twilio";
import { config } from "../config/constants";
import { StudentModel } from "../models/studentModel";
import { logger } from "../helpers/logger";

export class SMSService {
  private client?: twilio.Twilio;

  constructor() {
    if (!config.TWILIO.ACCOUNT_SID || (!config.TWILIO.API_SECRET && !config.TWILIO.AUTH_TOKEN)) {
      logger.warn("Twilio credentials not configured. SMS notifications will be disabled.");
      return;
    }

    // Use API Key if available (recommended), otherwise fallback to Auth Token
    if (config.TWILIO.API_KEY_SID && config.TWILIO.API_SECRET) {
      this.client = twilio(config.TWILIO.API_KEY_SID, config.TWILIO.API_SECRET, {
        accountSid: config.TWILIO.ACCOUNT_SID,
      });
    }
  }

  /**
   * Send attendance notification to guardian via SMS
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
        logger.warn("Twilio not configured. Skipping SMS notification.");
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

      // Create the SMS message based on status
      const actionText = status === "checked-in" ? "checked in to" : "checked out from";
      const message = `Hello ${student.guardian.firstName},

Your child ${student.firstName} ${student.lastName} has ${actionText} ${subjectName} at ${formattedTime}.

- Eastern Tayabas College Attendance Management System`;

      // Send SMS
      const result = await this.client.messages.create({
        body: message,
        from: config.TWILIO.PHONE_NUMBER,
        to: phoneNumber,
      });

      logger.info(
        `SMS sent successfully to ${phoneNumber} for student ${student.firstName} ${student.lastName}. Message SID: ${result.sid}`
      );
      return true;
    } catch (error: any) {
      logger.error(`Failed to send SMS notification: ${error.message}`, {
        studentId: student._id,
        guardianPhone: student.guardian?.phoneNumber,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Send a test SMS to verify Twilio configuration
   * @param phoneNumber - Phone number to send test SMS to
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

      const result = await this.client.messages.create({
        body: "Test message from School Attendance System. SMS notifications are working correctly!",
        from: config.TWILIO.PHONE_NUMBER,
        to: formattedPhone,
      });

      logger.info(`Test SMS sent successfully to ${formattedPhone}. Message SID: ${result.sid}`);
      return true;
    } catch (error: any) {
      logger.error(`Failed to send test SMS: ${error.message}`);
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
