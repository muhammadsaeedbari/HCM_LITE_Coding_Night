

import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import {
  listLeaves,
  applyLeave,
  reviewLeave,
} from '../controllers/leaveController.js';

const router = express.Router();

router.use(protect);
router.get('/', listLeaves);
router.post('/', applyLeave);
router.patch('/:id/review', authorize('admin', 'hr'), reviewLeave);

export default router;


