import { Router } from 'express';
import { auth } from '../../shared/middleware/auth';
import { requireRole } from '../../shared/middleware/rbac';
import * as c from './notifications.controller';

export const notificationsRouter = Router();
notificationsRouter.get('/', auth, requireRole('user'), c.listNotifications);
notificationsRouter.get('/unread-count', auth, requireRole('user'), c.getUnreadCount);
notificationsRouter.put('/read-all', auth, requireRole('user'), c.markAllRead);
notificationsRouter.put('/:id/read', auth, requireRole('user'), c.markRead);
