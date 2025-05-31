import { Request, Response } from "express";
import { route } from "express-extract-routes";
import { AuthMiddleware, Authenticated } from "../middleware/authMiddleware";
import { UseMiddleware } from "../middleware/useMiddleware";
import { EventService } from "../services/eventService";

// Purpose: This controller class is responsible for handling event-related requests.
@route("/event")
@Authenticated()
export class EventController {
  private eventService: EventService;

  constructor() {
    this.eventService = new EventService();
  }

  /**
   * @swagger
   * /event:
   *   post:
   *     summary: Create a new event
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - name
   *               - date
   *               - location
   *               - type
   *             properties:
   *               name:
   *                 type: string
   *               date:
   *                 type: string
   *                 format: date
   *               location:
   *                 type: string
   *               type:
   *                 type: string
   *                 enum: ["academic", "examination", "holiday", "activity", "meeting"]
   *               organizerId:
   *                 type: string
   *     responses:
   *       201:
   *         description: Event created successfully
   *       400:
   *         description: Invalid request data
   *     tags: [Event]
   */
  @route.post("/")
  @UseMiddleware(new AuthMiddleware().authorize("admin", "teacher"))
  async createEvent(req: Request, res: Response): Promise<Response> {
    try {
      const event = await this.eventService.createEvent(req.body);
      return res.status(201).json({
        success: true,
        data: event,
      });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        error: {
          code: error.code || "EVENT_CREATE_ERROR",
          message: error.message || "Failed to create event",
          statusCode: error.statusCode || 500,
        },
      });
    }
  }

  /**
   * @swagger
   * /event/{id}:
   *   get:
   *     summary: Get event by ID
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Event found successfully
   *       404:
   *         description: Event not found
   *     tags: [Event]
   */
  @route.get("/:id")
  async getEvent(req: Request, res: Response): Promise<Response> {
    try {
      const event = await this.eventService.getEventById(req.params.id);
      return res.status(200).json({
        success: true,
        data: event,
      });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        error: {
          code: error.code || "EVENT_FETCH_ERROR",
          message: error.message || "Failed to fetch event",
          statusCode: error.statusCode || 500,
        },
      });
    }
  }

  /**
   * @swagger
   * /event/{id}:
   *   put:
   *     summary: Update event
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name:
   *                 type: string
   *               date:
   *                 type: string
   *                 format: date
   *               location:
   *                 type: string
   *               type:
   *                 type: string
   *                 enum: ["academic", "examination", "holiday", "activity", "meeting"]
   *               organizerId:
   *                 type: string
   *     responses:
   *       200:
   *         description: Event updated successfully
   *       404:
   *         description: Event not found
   *     tags: [Event]
   */
  @route.put("/:id")
  async updateEvent(req: Request, res: Response): Promise<Response> {
    try {
      const updatedEvent = await this.eventService.updateEvent(req.params.id, req.body);
      return res.status(200).json({
        success: true,
        data: updatedEvent,
      });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        error: {
          code: error.code || "EVENT_UPDATE_ERROR",
          message: error.message || "Failed to update event",
          statusCode: error.statusCode || 500,
        },
      });
    }
  }

  /**
   * @swagger
   * /event/{id}:
   *   delete:
   *     summary: Delete event
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       204:
   *         description: Event deleted successfully
   *       404:
   *         description: Event not found
   *     tags: [Event]
   */
  @route.delete("/:id")
  @UseMiddleware(new AuthMiddleware().authorize("admin"))
  async deleteEvent(req: Request, res: Response): Promise<Response> {
    try {
      await this.eventService.deleteEvent(req.params.id);
      return res.status(204).json({
        success: true,
        message: "Event deleted successfully",
      });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        error: {
          code: error.code || "EVENT_DELETE_ERROR",
          message: error.message || "Failed to delete event",
          statusCode: error.statusCode || 500,
        },
      });
    }
  }

  /**
   * @swagger
   * /event:
   *   get:
   *     summary: Get all events
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: List of all events
   *     tags: [Event]
   */
  @route.get("/")
  @UseMiddleware(new AuthMiddleware().authorize("admin", "teacher"))
  async getAllEvents(req: Request, res: Response): Promise<Response> {
    try {
      const events = await this.eventService.getAllEvents();
      return res.status(200).json({
        success: true,
        data: events,
      });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        error: {
          code: error.code || "EVENTS_FETCH_ERROR",
          message: error.message || "Failed to fetch events",
          statusCode: error.statusCode || 500,
        },
      });
    }
  }
}
