import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  getDashboardSummary,
  askSmartHelper,
} from '../controllers/dashboardController.js';

const router = express.Router();

router.use(protect);
router.get('/summary', getDashboardSummary);
router.post('/helper', askSmartHelper);

export default router;
