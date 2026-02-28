import { Request, Response } from 'express';
import * as bcrypt from 'bcryptjs';

// Mock DB - replace with real DB logic
const users: any[] = [
  // Example user
  // { email: 'test@example.com', storeMobile: '1234567890', passwordHash: '...' }
];

export const resetPassword = async (req: Request, res: Response) => {
  const { email, storeMobile, password, confirmPassword } = req.body;

  if (!email && !storeMobile) {
    return res.status(400).json({ message: 'Email or store mobile number is required.' });
  }
  if (!password || !confirmPassword) {
    return res.status(400).json({ message: 'Password and confirm password are required.' });
  }
  if (password !== confirmPassword) {
    return res.status(400).json({ message: 'Passwords do not match.' });
  }

  // Find user by email or storeMobile
  const user = users.find(
    u => (email && u.email === email) || (storeMobile && u.storeMobile === storeMobile)
  );
  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }

  // Hash new password
  const salt = await bcrypt.genSalt(10);
  user.passwordHash = await bcrypt.hash(password, salt);

  // Save user (mock)
  // In real DB, update the user record

  return res.json({ message: 'Password reset successful.' });
};
