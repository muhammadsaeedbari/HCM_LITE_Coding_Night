


import Attendance from '../models/Attendance.js';
import Employee from '../models/Employee.js';

const validId = (id) => /^[a-f\d]{24}$/i.test(String(id));

const getToday = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const listAttendance = async (req, res, next) => {
  try {
    const filter = { companyId: req.user.companyId };

    if (req.user.role === 'employee') {
      const employee = await Employee.findOne({
        userId: req.user._id,
        companyId: req.user.companyId,
      });

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

    if (req.query.date) filter.date = req.query.date;

    const records = await Attendance.find(filter)
      .populate('employeeId', 'employeeCode firstName lastName email')
      .sort({ date: -1 })
      .limit(200);

    res.json({ success: true, data: records });
  } catch (error) {
    next(error);
  }
};

export const checkIn = async (req, res, next) => {
  try {
    let employeeId = req.body.employeeId;

    if (req.user.role === 'employee') {
      const employee = await Employee.findOne({
        userId: req.user._id,
        companyId: req.user.companyId,
        status: 'active',
      });

      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Active employee profile not found.',
        });
      }

      employeeId = employee._id;
    }

    if (!validId(employeeId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid employeeId is required.',
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
        message: 'Employee not found in your company.',
      });
    }

    const date = getToday();

    const existing = await Attendance.findOne({
      companyId: req.user.companyId,
      employeeId,
      date,
    });

    if (existing?.checkIn) {
      return res.status(409).json({
        success: false,
        message: 'Employee has already checked in today.',
      });
    }

    const record = await Attendance.findOneAndUpdate(
      { companyId: req.user.companyId, employeeId, date },
      {
        $set: {
          checkIn: new Date(),
          status: 'present',
        },
        $setOnInsert: {
          companyId: req.user.companyId,
          employeeId,
          date,
        },
      },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(201).json({ success: true, data: record });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Attendance already exists for today.',
      });
    }
    next(error);
  }
};

export const checkOut = async (req, res, next) => {
  try {
    let employeeId = req.body.employeeId;

    if (req.user.role === 'employee') {
      const employee = await Employee.findOne({
        userId: req.user._id,
        companyId: req.user.companyId,
      });

      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employee profile not found.',
        });
      }

      employeeId = employee._id;
    }

    if (!validId(employeeId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid employeeId is required.',
      });
    }

    const record = await Attendance.findOne({
      companyId: req.user.companyId,
      employeeId,
      date: getToday(),
    });

    if (!record?.checkIn) {
      return res.status(400).json({
        success: false,
        message: 'Check-in is required before check-out.',
      });
    }

    if (record.checkOut) {
      return res.status(409).json({
        success: false,
        message: 'Employee has already checked out.',
      });
    }

    record.checkOut = new Date();
    await record.save();

    res.json({ success: true, data: record });
  } catch (error) {
    next(error);
  }
};


