import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import {
  getCompanySettings,
  updateCompanySettings,
  listDepartments,
  createDepartment,
  updateDepartment,
  listDesignations,
  createDesignation,
  updateDesignation,
  listEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
} from '../controllers/organizationController.js';

const router = express.Router();
const managers = [protect, authorize('admin', 'hr')];

router.get('/settings', protect, getCompanySettings);
router.put('/settings', ...managers, updateCompanySettings);
router.patch('/settings', ...managers, updateCompanySettings);

router.get('/departments', protect, listDepartments);
router.post('/departments', ...managers, createDepartment);
router.patch('/departments/:id', ...managers, updateDepartment);

router.get('/designations', protect, listDesignations);
router.post('/designations', ...managers, createDesignation);
router.patch('/designations/:id', ...managers, updateDesignation);

router.get('/employees', protect, listEmployees);
router.post('/employees', ...managers, createEmployee);
router.patch('/employees/:id', ...managers, updateEmployee);
router.delete('/employees/:id', ...managers, deleteEmployee);

export default router;
