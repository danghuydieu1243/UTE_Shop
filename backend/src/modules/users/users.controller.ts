import { asyncHandler } from '../../shared/http/asyncHandler';
import { ok } from '../../shared/http/response';
import * as usersService from './users.service';

export const updateProfile = asyncHandler(async (req, res) => {
  ok(res, await usersService.updateProfile(req.user!.id, req.body));
});

export const changePassword = asyncHandler(async (req, res) => {
  ok(res, await usersService.changePassword(req.user!.id, req.body));
});
