import { AppError } from "../middleware/errorHandler";
import Event, { EventModel } from "../models/eventModel";

export class EventRepository {
  /**
   * Create a new event
   * @param data - Event data
   */
  async create(data: Partial<EventModel>): Promise<EventModel> {
    try {
      return await Event.create(data);
    } catch (error: any) {
      throw new AppError("Failed to create event", 500);
    }
  }

  /**
   * Find event by ID
   * @param id - Event ID
   */
  async findById(id: string): Promise<EventModel | null> {
    try {
      return await Event.findById(id);
    } catch (error) {
      throw new AppError("Failed to find event", 500);
    }
  }

  /**
   * Update event
   * @param id - Event ID
   * @param data - Updated event data
   */
  async update(id: string, data: Partial<EventModel>): Promise<EventModel | null> {
    try {
      return await Event.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
    } catch (error: any) {
      throw new AppError("Failed to update event", 500);
    }
  }

  /**
   * Delete event
   * @param id - Event ID
   */
  async delete(id: string): Promise<EventModel | null> {
    try {
      return await Event.findByIdAndDelete(id);
    } catch (error) {
      throw new AppError("Failed to delete event", 500);
    }
  }

  /**
   * Find all events
   */
  async findAll(): Promise<EventModel[]> {
    try {
      return await Event.find();
    } catch (error) {
      throw new AppError("Failed to fetch events", 500);
    }
  }
}
