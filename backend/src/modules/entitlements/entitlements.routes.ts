/**
 * Entitlements routes — /me/ebooks và /download
 */

import { Router } from 'express';
import { auth } from '../../shared/middleware/auth';
import { requireRole } from '../../shared/middleware/rbac';
import { asyncHandler } from '../../shared/http/asyncHandler';
import { getMyEbooks, requestDownload, serveFile } from './entitlements.controller';

// Router cho /me/ebooks — yêu cầu auth + role 'user'
export const entitlementsRouter = Router();

entitlementsRouter.get('/', auth, requireRole('user'), asyncHandler(getMyEbooks));
entitlementsRouter.post('/:bookId/download', auth, requireRole('user'), asyncHandler(requestDownload));

// Router cho /download — PUBLIC (không qua auth, dùng JWT trong query param)
export const downloadRouter = Router();

downloadRouter.get('/', asyncHandler(serveFile));
