import nodemailer from "nodemailer";
import { UserRepository } from "../repositories/userRepository";
import { EventModel } from "../models/eventModel";

export class EmailService {
  private transporter: nodemailer.Transporter;
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
    this.transporter = nodemailer.createTransport({
      service: "gmail", // Using Gmail as default free service
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD, // Use App Password for Gmail
      },
    });
  }

  /**
   * Send event notification email to all users
   * @param event - Event data
   */
  async sendEventNotificationToAllUsers(event: EventModel): Promise<void> {
    try {
      // Get all users with email addresses
      const users = await this.userRepository.getUsers();
      const emailRecipients = users
        .filter((user) => user.email)
        .map((user) => user.email);

      if (emailRecipients.length === 0) {
        console.log("No users with email addresses found");
        return;
      }

      // Prepare email content
      const emailSubject = `New Event Created: ${event.name}`;
      const emailBody = this.generateEventEmailHTML(event);

      // Send email to all recipients
      const mailOptions = {
        from: process.env.EMAIL_USER,
        bcc: emailRecipients, // Using BCC to hide recipient list
        subject: emailSubject,
        html: emailBody,
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Event notification sent to ${emailRecipients.length} users`);
    } catch (error: any) {
      console.error("Failed to send event notification emails:", error);
      const err = new Error("Failed to send event notification emails") as any;
      err.statusCode = 500;
      err.code = "EMAIL_SEND_ERROR";
      throw err;
    }
  }

  /**
   * Generate HTML content for event notification email
   * @param event - Event data
   */
  private generateEventEmailHTML(event: EventModel): string {
    const formatDate = (date: Date | undefined) => {
      if (!date) return "N/A";
      return new Date(date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
      <meta charset="utf-8">
      <title>New Event Notification</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9f9f9; }
        .event-details { background-color: white; padding: 15px; margin: 10px 0; border-radius: 5px; }
        .event-type { 
        display: inline-block; 
        padding: 5px 10px; 
        border-radius: 3px; 
        color: white;
        font-size: 12px;
        text-transform: uppercase;
        ${this.getEventTypeStyle(event.type)}
        }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
      </style>
      </head>
      <body>
      <div class="container">
        <div class="header">
        <h1>📅 New Event Created</h1>
        </div>
        <div class="content">
        <h2>Hello!</h2>
        <p>A new event has been created in the attendance system. Here are the details:</p>
        
        <div class="event-details">
          <h3>${event.name}</h3>
          <p><strong>⏰ Start Date:</strong> ${formatDate(event.startDate)}</p>
          <p><strong>⏰ End Date:</strong> ${formatDate(event.endDate)}</p>
          <p><strong>📍 Location:</strong> ${event.location}</p>
          <p><strong>🏷️ Type:</strong> <span class="event-type">${event.type}</span></p>
          ${event.description ? `<p><strong>📝 Description:</strong> ${event.description}</p>` : ""}
        </div>
        
        <p>Please make sure to mark your calendar and be prepared for this event.</p>
        </div>
        <div class="footer">
        <p>This is an automated message from the Attendance Management System.</p>
        <p>Please do not reply to this email.</p>
        </div>
      </div>
      </body>
      </html>
    `;
  }

  /**
   * Get CSS styles based on event type
   * @param type - Event type
   */
  private getEventTypeStyle(type: string): string {
    const styles = {
      academic: "background-color: #2196F3;",
      examination: "background-color: #f44336;",
      holiday: "background-color: #4CAF50;",
      activity: "background-color: #FF9800;",
      meeting: "background-color: #9C27B0;",
    };
    return styles[type as keyof typeof styles] || "background-color: #666;";
  }

  /**
   * Verify email configuration
   */
  async verifyEmailConfig(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error("Email configuration verification failed:", error);
      return false;
    }
  }
}
