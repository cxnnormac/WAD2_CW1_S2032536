// controllers/bookingController.js
import {
  bookCourseForUser,
  bookSessionForUser,
} from "../services/bookingService.js";
import { BookingModel } from "../models/bookingModel.js";
import { SessionModel } from "../models/sessionModel.js";

const silentClientCodes = new Set([
  "DUPLICATE_BOOKING",
  "NOT_FOUND",
  "NO_SESSIONS",
  "DROPIN_NOT_ALLOWED",
]);

export const bookCourse = async (req, res) => {
  try {
    const { userId, courseId } = req.body;
    const booking = await bookCourseForUser(userId, courseId);
    res.status(201).json({ booking });
  } catch (err) {
    if (!silentClientCodes.has(err.code)) console.error(err);
    if (err.code === "DUPLICATE_BOOKING") {
      return res.status(409).json({ error: err.message, bookingId: err.bookingId });
    }
    if (err.code === "NOT_FOUND") {
      return res.status(404).json({ error: err.message });
    }
    res.status(400).json({ error: err.message });
  }
};

export const bookSession = async (req, res) => {
  try {
    const { userId, sessionId } = req.body;
    const booking = await bookSessionForUser(userId, sessionId);
    res.status(201).json({ booking });
  } catch (err) {
    if (!silentClientCodes.has(err.code)) console.error(err);
    if (err.code === "DUPLICATE_BOOKING") {
      return res
        .status(409)
        .json({ error: err.message, bookingId: err.bookingId });
    }
    if (err.code === "DROPIN_NOT_ALLOWED") {
      return res.status(400).json({ error: err.message });
    }
    if (err.code === "NOT_FOUND") {
      return res.status(404).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
};

export const cancelBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const booking = await BookingModel.findById(bookingId);
    if (!booking) return res.status(404).json({ error: "Booking not found" });
    if (booking.status === "CANCELLED") return res.json({ booking });

    if (booking.status === "CONFIRMED") {
      for (const sid of booking.sessionIds) {
        await SessionModel.incrementBookedCount(sid, -1);
      }
    }
    const updated = await BookingModel.cancel(bookingId);
    res.json({ booking: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to cancel booking" });
  }
};
