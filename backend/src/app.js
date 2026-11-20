import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsRoot = path.resolve(__dirname, '../uploads');

import errorHandler from './middleware/error.middleware.js';
import employeeRoutes from './features/employees/employee.routes.js';
import ticketRoutes from './features/tickets/ticket.routes.js';
import emailRoutes from './features/emails/email.routes.js';
import authRoutes from './features/auth/auth.routes.js'
import authMiddleware from './middleware/auth.middleware.js';
import roleMiddleware from './middleware/role.middleware.js';
import dashboardRoutes from './features/dashboard/dashboard.routes.js';
import categoryRoutes from './features/categories/categories.routes.js';
import workflowRoutes from './features/workflow/workflow.routes.js';
import notificationRoutes from './features/notifications/notifications.routes.js';
import attachmentRoutes from './features/attachments/attachments.routes.js';

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }));
app.use(express.json());
app.use('/uploads', express.static(uploadsRoot));

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));
app.use('/api/employees', authMiddleware, roleMiddleware('Admin'), employeeRoutes);
app.use('/api/auth', authRoutes)
app.use('/api/tickets',authMiddleware, ticketRoutes);
app.use('/api/dashboard', authMiddleware, dashboardRoutes);
app.use('/api/categories', authMiddleware, categoryRoutes);
app.use('/api/workflow', authMiddleware, workflowRoutes);
app.use('/api/notifications', authMiddleware, notificationRoutes);
app.use('/api/attachments', authMiddleware, attachmentRoutes);
app.use('/api/emails', authMiddleware, emailRoutes);

app.use(errorHandler);

export default app;