import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Event name is required"],
      trim: true,
    },
    date: {
      type: Date,
      required: [true, "Event date is required"],
    },
    capacity: {
      type: Number,
      required: [true, "Event capacity is required"],
      min: [1, "Capacity must be at least 1"],
    },
    registeredSeats: {
      type: Number,
      default: 0,
      min: [0, "Registered seats cannot be negative"],
    },
    status: {
      type: String,
      required: [true, "Event status is required"],
      enum: {
        values: ["upcoming", "ongoing", "completed", "cancelled"],
        message: "{VALUE} is not a valid status",
      },
      default: "upcoming",
    },
  },
  {
    timestamps: true,
  }
);

const Event = mongoose.model("Event", eventSchema);

export default Event;
