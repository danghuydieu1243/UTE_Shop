import { Navigate } from 'react-router-dom';

/**
 * /reset-password is no longer the entry point for the reset flow.
 * The full 3-step wizard lives at /forgot-password.
 * This redirect ensures any old bookmarked/deep links still land correctly.
 */
export const ResetPasswordPage = () => <Navigate to="/forgot-password" replace />;
