
import express from 'express';
import {
  getSetupStatus,
  createInitialAdmin,
} from '../controllers/setupController.js';

const router = express.Router();

router.get('/status', getSetupStatus);
router.post('/initial-admin', createInitialAdmin);

export default router;
