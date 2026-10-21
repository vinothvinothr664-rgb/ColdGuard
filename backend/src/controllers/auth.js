import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';
import { signUser } from '../utils/auth.js';
const publicUser = user => ({ id: String(user._id), name: user.name, email: user.email, role: user.role });
export async function register(req, res) {
  const { name, email, password } = req.body || {};
  if (!name?.trim() || !email?.trim() || typeof password !== 'string') return res.status(400).json({ message: 'Name, email and password are required' });
  if (password.length < 10) return res.status(400).json({ message: 'Password must be at least 10 characters' });
  const normalizedEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) return res.status(400).json({ message: 'Enter a valid email address' });
  if (await User.findOne({ email: normalizedEmail })) return res.status(409).json({ message: 'Email already registered' });
  const user = await User.create({ name: name.trim(), email: normalizedEmail, password: await bcrypt.hash(password, 12), role: 'viewer' });
  await AuditLog.create({ action: 'REGISTER', entity: 'User', entityId: String(user._id), userId: String(user._id), userEmail: user.email });
  res.status(201).json({ token: signUser(user), user: publicUser(user) });
}
export async function login(req, res) {
  const { email, password } = req.body || {};
  if (!email || typeof password !== 'string') return res.status(400).json({ message: 'Email and password are required' });
  const user = await User.findOne({ email: String(email).trim().toLowerCase() }).select('+password');
  if (!user || user.active === false || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }
  await AuditLog.create({ action: 'LOGIN', entity: 'User', entityId: String(user._id), userId: String(user._id), userEmail: user.email });
  res.json({ token: signUser(user), user: publicUser(user) });
}
