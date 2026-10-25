


import mongoose from 'mongoose';

const payrollSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true
    },
    period: {
      type: String,
      required: true,
      match: /^\d{4}-(0[1-9]|1[0-2])$/
    },
    basicSalary: {
      type: Number,
      required: true,
      min: 0
    },
    allowances: {
      type: Number,
      default: 0,
      min: 0
    },
    deductions: {
      type: Number,
      default: 0,
      min: 0
    },
    grossSalary: {
      type: Number,
      required: true,
      min: 0
    },
    netSalary: {
      type: Number,
      required: true,
      min: 0
    },
    status: {
      type: String,
      enum: ['draft', 'approved', 'paid'],
      default: 'draft'
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    paidAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    collection: 'payrolls'
  }
);

payrollSchema.index(
  { companyId: 1, employeeId: 1, period: 1 },
  { unique: true }
);

const Payroll =
  mongoose.models.Payroll ||
  mongoose.model('Payroll', payrollSchema);

export default Payroll;


