import mongoose from 'mongoose';

const companySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    officeStartTime: {
      type: String,
      default: '09:00',
    },
    graceMinutes: {
      type: Number,
      default: 15,
      min: 0,
    },
    halfDayHours: {
      type: Number,
      default: 5,
      min: 0,
    },
    leaveQuota: {
      type: Number,
      default: 20,
      min: 0,
    },
    weekendDays: {
      type: [Number],
      default: [6, 0],
      validate: {
        validator: (days) =>
          days.every((day) => Number.isInteger(day) && day >= 0 && day <= 6),
        message: 'Weekend days must be numbers from 0 to 6.',
      },
    },
    officeLocation: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
      radiusMeters: { type: Number, default: 150, min: 0 },
    },
    setupCompleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: 'companies',
  }
);

const Company =
  mongoose.models.Company ||
  mongoose.model('Company', companySchema);

export default Company;
