import express from 'express';
import { createEmployee, getAllEmployees, getEmployeeById, updateEmployee, setActiveEmployee } from './employee.controller.js';

const router = express.Router();

router.post('/', createEmployee);
router.get('/', getAllEmployees);
router.get('/:id', getEmployeeById);
router.put('/:id', updateEmployee);
// Route to activate/deactivate employee (expects { active: true/false } in body)
router.patch('/:id/active', setActiveEmployee);
router.put('/:id/active', setActiveEmployee);

export default router;
