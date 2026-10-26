import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import {
  listPayroll,
  previewPayrollCalculation,
  createPayroll,
  updatePayrollStatus,
} from '../controllers/payrollController.js';

const router = express.Router();

router.use(protect);
router.get('/', listPayroll);
router.get('/preview', authorize('admin', 'hr'), previewPayrollCalculation);
router.post('/', authorize('admin', 'hr'), createPayroll);
router.patch('/:id/status', authorize('admin', 'hr'), updatePayrollStatus);

export default router;
