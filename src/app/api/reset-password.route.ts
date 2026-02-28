import express from 'express';
import { resetPassword } from './reset-password.api';

const router = express.Router();

// POST /api/medical-store/reset-password
router.post('/medical-store/reset-password', (req, res) => {
  // resetPassword is async, so call and handle promise
  resetPassword(req, res);
});

export default router;
