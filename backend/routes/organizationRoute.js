

import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import {
  listDepartments,
  createDepartment,
  updateDepartment,
  listDesignations,
  createDesignation,
  updateDesignation,
  listEmployees,
  createEmployee,
  updateEmployee,
} from '../controllers/organizationController.js';

const router = express.Router();
const managers = [protect, authorize('admin', 'hr')];

router.get('/departments', protect, listDepartments);
router.post('/departments', ...managers, createDepartment);
router.patch('/departments/:id', ...managers, updateDepartment);

router.get('/designations', protect, listDesignations);
router.post('/designations', ...managers, createDesignation);
router.patch('/designations/:id', ...managers, updateDesignation);

router.get('/employees', protect, listEmployees);
router.post('/employees', ...managers, createEmployee);
router.patch('/employees/:id', ...managers, updateEmployee);

export default router;

