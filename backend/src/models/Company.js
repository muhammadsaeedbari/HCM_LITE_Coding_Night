import mongoose from "mongoose";

const companySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      trim: true,
      lowercase: true
    },

    phone: {
      type: String,
      trim: true,
      default: ""
    },

    address: {
      type: String,
      trim: true,
      default: ""
    },

    timezone: {
      type: String,
      default: "Asia/Karachi"
    },

    officeHours: {
      startTime: {
        type: String,
        default: "09:00"
      },

      endTime: {
        type: String,
        default: "18:00"
      }
    },

    graceMinutes: {
      type: Number,
      default: 15
    },

    halfDayHours: {
      type: Number,
      default: 5
    },

    weekendDays: {
      type: [Number],
      default: [0, 6]
    },

    officeLocation: {
      latitude: {
        type: Number,
        default: null
      },

      longitude: {
        type: Number,
        default: null
      },

      radiusMeters: {
        type: Number,
        default: 150
      }
    },

    setupCompleted: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

const Company = mongoose.model("Company", companySchema);

export default Company;