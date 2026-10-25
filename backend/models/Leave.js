

import mongoose from 'mongoose';

const leaveSchema = new mongoose.Schema(
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
    leaveType: {
      type: String,
      enum: ['annual', 'sick', 'casual', 'unpaid'],
      required: true,
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    reason: { type: String, required: true, trim: true, maxlength: 1000 },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: { type: Date, default: null },
    reviewNote: { type: String, trim: true, default: '', maxlength: 500 },
  },
  { timestamps: true, collection: 'leaves' }
);

leaveSchema.index({ companyId: 1, employeeId: 1, startDate: 1, endDate: 1 });

export default mongoose.models.Leave ||
  mongoose.model('Leave', leaveSchema);


  