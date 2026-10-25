


import Leave from '../models/Leave.js';
import Employee from '../models/Employee.js';

const validId = (id) => /^[a-f\d]{24}$/i.test(String(id));

async function getEmployeeForUser(user) {
  return Employee.findOne({
    userId: user._id,
    companyId: user.companyId,
  });
}

export const listLeaves = async (req, res, next) => {
  try {
    const filter = { companyId: req.user.companyId };

    if (req.user.role === 'employee') {
      const employee = await getEmployeeForUser(req.user);
      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employee profile not found.',
        });
      }
      filter.employeeId = employee._id;
    } else if (req.query.employeeId) {
      if (!validId(req.query.employeeId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid employee ID.',
        });
      }
      filter.employeeId = req.query.employeeId;
    }

    const data = await Leave.find(filter)
      .populate('employeeId', 'employeeCode firstName lastName')
      .populate('reviewedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(200);

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const applyLeave = async (req, res, next) => {
  try {
    const { leaveType, startDate, endDate, reason } = req.body;
    let employeeId = req.body.employeeId;

    if (req.user.role === 'employee') {
      const employee = await getEmployeeForUser(req.user);
      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employee profile not found.',
        });
      }
      employeeId = employee._id;
    }

    if (
      !validId(employeeId) ||
      !['annual', 'sick', 'casual', 'unpaid'].includes(leaveType) ||
      !startDate ||
      !endDate ||
      !reason?.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please provide valid leave details.',
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      start > end
    ) {
      return res.status(400).json({
        success: false,
        message: 'Leave dates are invalid.',
      });
    }

    const employee = await Employee.findOne({
      _id: employeeId,
      companyId: req.user.companyId,
      status: 'active',
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Active employee not found.',
      });
    }

    const overlap = await Leave.findOne({
      companyId: req.user.companyId,
      employeeId,
      status: { $in: ['pending', 'approved'] },
      startDate: { $lte: end },
      endDate: { $gte: start },
    });

    if (overlap) {
      return res.status(409).json({
        success: false,
        message: 'Leave dates overlap with an existing request.',
      });
    }

    const data = await Leave.create({
      companyId: req.user.companyId,
      employeeId,
      leaveType,
      startDate: start,
      endDate: end,
      reason: reason.trim(),
    });

    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const reviewLeave = async (req, res, next) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid leave ID.',
      });
    }

    const { status, reviewNote = '' } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be approved or rejected.',
      });
    }

    const leave = await Leave.findOne({
      _id: req.params.id,
      companyId: req.user.companyId,
    });

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found.',
      });
    }

    if (leave.status !== 'pending') {
      return res.status(409).json({
        success: false,
        message: 'This request has already been reviewed.',
      });
    }

    if (status === 'approved') {
      const overlap = await Leave.findOne({
        _id: { $ne: leave._id },
        companyId: leave.companyId,
        employeeId: leave.employeeId,
        status: 'approved',
        startDate: { $lte: leave.endDate },
        endDate: { $gte: leave.startDate },
      });

      if (overlap) {
        return res.status(409).json({
          success: false,
          message: 'An approved leave already overlaps these dates.',
        });
      }
    }

    leave.status = status;
    leave.reviewedBy = req.user._id;
    leave.reviewedAt = new Date();
    leave.reviewNote = String(reviewNote).slice(0, 500);

    await leave.save();

    res.json({ success: true, data: leave });
  } catch (error) {
    next(error);
  }
};
