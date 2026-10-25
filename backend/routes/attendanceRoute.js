

import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import {
  listAttendance,
  checkIn,
  checkOut,
} from '../controllers/attendanceController.js';

const router = express.Router();

router.use(protect);
router.get('/', listAttendance);
router.post('/check-in', checkIn);
router.post('/check-out', checkOut);

export default router;

