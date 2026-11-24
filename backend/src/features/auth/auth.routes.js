
import express from 'express';
import {
  login,
  resetEmployeePasswordController,
  updatePasswordController,
  getMeController,
  logout,
} from './auth.controller.js';
import authMiddleware from '../../middleware/auth.middleware.js';
import roleMiddleware from '../../middleware/role.middleware.js';

const router = express.Router();

router.post('/login', login);
router.post('/logout', logout);
router.get('/me', authMiddleware, getMeController);

router.put('/change-password', authMiddleware, updatePasswordController);

router.put(
  '/reset-password/:id',
  authMiddleware,
  roleMiddleware('Admin'),
  resetEmployeePasswordController
);

export default router;
