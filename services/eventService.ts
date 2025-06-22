import { EventModel } from "../models/eventModel";
import { EventRepository } from "../repositories/eventRepository";
import { EmailService } from "./emailService";

export class EventService {
  private eventRepository: EventRepository;
  private emailService: EmailService;

  constructor() {
    this.eventRepository = new EventRepository();
    this.emailService = new EmailService();
  }

  /**
   * Create a new event
   * @param eventData - Event data
   */
  async createEvent(eventData: Partial<EventModel>): Promise<EventModel> {
    try {
      const createdEvent = await this.eventRepository.create(eventData);

      // Send email notification to all users
      try {
        await this.emailService.sendEventNotificationToAllUsers(createdEvent);
      } catch (emailError: any) {
        // Log email error but don't fail the event creation
        console.error("Failed to send email notifications:", emailError);
      }

      return createdEvent;
    } catch (error: any) {
      const err = new Error("Failed to create event") as any;
      err.statusCode = 500;
      err.code = "EVENT_CREATE_ERROR";
      throw err;
    }
  }

  /**
   * Get event by ID
   * @param id - Event ID
   */
  async getEventById(id: string): Promise<EventModel> {
    const event = await this.eventRepository.findById(id);
    if (!event) {
      const error = new Error("Event not found") as any;
      error.statusCode = 404;
      error.code = "EVENT_NOT_FOUND";
      throw error;
    }
    return event;
  }

  /**
   * Update event
   * @param id - Event ID
   * @param updateData - Updated event data
   */
  async updateEvent(id: string, updateData: Partial<EventModel>): Promise<EventModel> {
    try {
      const updatedEvent = await this.eventRepository.update(id, updateData);
      if (!updatedEvent) {
        const error = new Error("Event not found") as any;
        error.statusCode = 404;
        error.code = "EVENT_NOT_FOUND";
        throw error;
      }
      return updatedEvent;
    } catch (error: any) {
      const err = new Error("Failed to update event") as any;
      err.statusCode = 500;
      err.code = "EVENT_UPDATE_ERROR";
      throw err;
    }
  }

  /**
   * Delete event
   * @param id - Event ID
   */
  async deleteEvent(id: string): Promise<void> {
    const result = await this.eventRepository.delete(id);
    if (!result) {
      const error = new Error("Event not found") as any;
      error.statusCode = 404;
      error.code = "EVENT_NOT_FOUND";
      throw error;
    }
  }

  /**
   * Get all events
   */
  async getAllEvents(): Promise<EventModel[]> {
    try {
      return await this.eventRepository.findAll();
    } catch (error) {
      const err = new Error("Failed to fetch events") as any;
      err.statusCode = 500;
      err.code = "EVENTS_FETCH_ERROR";
      throw err;
    }
  }
}
