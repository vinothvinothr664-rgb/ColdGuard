import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const secret = () => {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be configured with at least 32 characters');
  }
  return process.env.JWT_SECRET;
};
export function signUser(user) {
  return jwt.sign({ id: String(user._id), tokenVersion: user.tokenVersion || 0 }, secret(), { expiresIn: '8h', issuer: 'coldguard' });
}
export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return res.status(401).json({ message: 'Authentication required' });
  try {
    const payload = jwt.verify(token, secret(), { issuer: 'coldguard' });
    const user = await User.findById(payload.id).select('_id name email role active tokenVersion');
    if (!user || user.active === false || (payload.tokenVersion || 0) !== (user.tokenVersion || 0)) return res.status(401).json({ message: 'Account is unavailable' });
    req.user = { id: String(user._id), name: user.name, email: user.email, role: user.role };
    return next();
  } catch (error) {
    if (error.message?.includes('JWT_SECRET')) return next(error);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}
export function requireRole(...roles) {
  return (req, res, next) => roles.includes(req.user?.role)
    ? next() : res.status(403).json({ message: 'Your role is not allowed to perform this action' });
}
