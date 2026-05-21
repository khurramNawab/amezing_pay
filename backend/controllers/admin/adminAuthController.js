import jwt from 'jsonwebtoken';
import User from '../../models/User.js';
import { env } from '../../config/env.js';

const generateToken = (id) =>
  jwt.sign({ id }, env.JWT_SECRET, {
    expiresIn: '30d',
  });

export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: 'email and password are required' });
    }

    const user = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    if (user.role !== 'admin') return res.status(403).json({ message: 'Not an admin account' });
    if (user.isBlocked) return res.status(403).json({ message: 'Account is blocked' });
    if (!user.password) return res.status(400).json({ message: 'Admin password not set' });

    const ok = await user.matchPassword(String(password));
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    return res.json({
      token: generateToken(user._id),
      user: {
        _id: user._id,
        name: user.name || '',
        email: user.email || '',
        role: user.role,
        adminRole: user.adminRole || 'sub_admin',
      },
    });
  } catch (e) {
    return res.status(500).json({ message: 'Server Error' });
  }
};

export const adminMe = async (req, res) => {
  return res.json({
    user: {
      _id: req.user._id,
      name: req.user.name || '',
      email: req.user.email || '',
      role: req.user.role,
      adminRole: req.user.adminRole || 'sub_admin',
    },
  });
};
