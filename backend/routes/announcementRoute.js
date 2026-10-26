import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import {
  listAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
} from '../controllers/announcementController.js';

const router = express.Router();

router.use(protect);
router.get('/', listAnnouncements);
router.post('/', authorize('admin', 'hr'), createAnnouncement);
router.delete('/:id', authorize('admin', 'hr'), deleteAnnouncement);

export default router;
