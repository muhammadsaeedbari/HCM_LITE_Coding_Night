

import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    date: { type: String, required: true },
    checkIn: { type: Date, default: null },
    checkOut: { type: Date, default: null },
    status: {
      type: String,
      enum: ['present', 'late', 'half-day', 'absent'],
      default: 'present',
    },
    notes: { type: String, trim: true, maxlength: 500, default: '' },
  },
  { timestamps: true, collection: 'attendances' }
);

attendanceSchema.index(
  { companyId: 1, employeeId: 1, date: 1 },
  { unique: true }
);

export default mongoose.models.Attendance ||
  mongoose.model('Attendance', attendanceSchema);


  