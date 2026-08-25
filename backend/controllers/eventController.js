import mongoose from "mongoose";
import logger from "../logger.js";
import Event from "../models/Event.js";
import Registration from "../models/Registration.js";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

export const getEvents = async (req, res) => {
  try {
    const events = await Event.find().sort({ date: 1 });

    return res.status(200).json({
      success: true,
      count: events.length,
      data: events,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch events",
      error: error.message,
    });
  }
};

export const getEventById = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid event ID",
      });
    }

    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: event,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch event",
      error: error.message,
    });
  }
};

export const createEvent = async (req, res) => {
  try {
    const { name, date, capacity, status } = req.body;

    if (!name || !date || !capacity) {
      return res.status(400).json({
        success: false,
        message: "Please provide name, date, and capacity",
      });
    }

    const event = await Event.create({ name, date, capacity, status });
    logger.info({ eventId: event._id }, "Event created successfully");

    return res.status(201).json({
      success: true,
      message: "Event created successfully",
      data: event,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: messages,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create event",
      error: error.message,
    });
  }
};

export const updateEvent = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid event ID",
      });
    }

    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    const updatedEvent = await Event.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true },
    );

    return res.status(200).json({
      success: true,
      message: "Event updated successfully",
      data: updatedEvent,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: messages,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update event",
      error: error.message,
    });
  }
};

export const deleteEvent = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid event ID",
      });
    }

    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    await Event.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Event deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete event",
      error: error.message,
    });
  }
};

export const registerSeat = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    if (!isValidObjectId(req.params.id)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "Invalid event ID",
      });
    }

    const event = await Event.findById(req.params.id).session(session);

    if (!event) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    if (event.status === "cancelled") {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "Cannot register for a cancelled event",
      });
    }

    if (event.status === "completed") {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "Cannot register for a completed event",
      });
    }

    if (event.registeredSeats >= event.capacity) {
      await session.abortTransaction();
      session.endSession();
      return res.status(409).json({
        success: false,
        message: "Event is fully booked",
      });
    }

    // Check if user is already registered
    const existingRegistration = await Registration.findOne({
      user: req.user.id,
      event: event._id,
    }).session(session);

    if (existingRegistration) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "You are already registered for this event",
      });
    }

    // Atomically increment the seat if it's less than capacity
    const updatedEvent = await Event.findOneAndUpdate(
      { 
        _id: event._id, 
        registeredSeats: { $lt: event.capacity } 
      },
      { $inc: { registeredSeats: 1 } },
      { new: true, session }
    );

    if (!updatedEvent) {
      await session.abortTransaction();
      session.endSession();
      return res.status(409).json({
        success: false,
        message: "Event is fully booked",
      });
    }

    // Create registration
    await Registration.create([{
      user: req.user.id,
      event: event._id,
    }], { session });

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      success: true,
      message: "Seat registered successfully",
      data: updatedEvent,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return res.status(500).json({
      success: false,
      message: "Failed to register seat",
      error: error.message,
    });
  }
};

export const getEventRegistrations = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid event ID",
      });
    }

    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    const registrations = await Registration.find({ event: req.params.id })
      .populate("user", "name email role")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: registrations.length,
      data: registrations,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch registrations",
      error: error.message,
    });
  }
};


export const getMyRegistrations = async (req, res) => {
  try {
    const registrations = await Registration.find({ user: req.user.id });
    const eventIds = registrations.map(reg => reg.event);

    return res.status(200).json({
      success: true,
      data: eventIds,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch your registrations",
      error: error.message,
    });
  }
};
