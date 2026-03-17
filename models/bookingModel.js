
// models/bookingModel.js
import { bookingsDb } from './_db.js';

export const BookingModel = {
  async create(booking) {
    return bookingsDb.insert({ ...booking, createdAt: new Date().toISOString() });
  },
  async findById(id) {
    return bookingsDb.findOne({ _id: id });
  },
  async listByUser(userId) {
    return bookingsDb.find({ userId }).sort({ createdAt: -1 });
  },
  async findActiveCourseBooking(userId, courseId) {
    return bookingsDb.findOne({
      userId,
      courseId,
      type: "COURSE",
      status: { $ne: "CANCELLED" },
    });
  },
  async findActiveSessionBooking(userId, sessionId) {
    return bookingsDb.findOne({
      userId,
      type: "SESSION",
      sessionIds: sessionId,
      status: { $ne: "CANCELLED" },
    });
  },
  async listBySession(sessionId, filter = {}) {
    return bookingsDb
      .find({ sessionIds: sessionId, ...filter })
      .sort({ createdAt: -1 });
  },
  async removeByUser(userId) {
    return bookingsDb.remove({ userId }, { multi: true });
  },
  async removeByCourse(courseId) {
    return bookingsDb.remove({ courseId }, { multi: true });
  },
  async cancel(id) {
    await bookingsDb.update({ _id: id }, { $set: { status: 'CANCELLED' } });
    return this.findById(id);
  }
};

