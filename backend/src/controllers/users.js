import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';
const roles = ['admin', 'manager', 'operator', 'viewer'];
const safe = u => ({ id: String(u._id), name: u.name, email: u.email, role: u.role, active: u.active !== false, createdAt: u.createdAt });
async function audit(req, action, user, details = {}) {
  await AuditLog.create({ action, entity: 'User', entityId: String(user._id), details, userId: req.user.id, userEmail: req.user.email });
}
export async function listUsers(req, res) { res.json((await User.find().sort({ createdAt: -1 })).map(safe)); }
export async function createUser(req, res) {
  const { name, email, password, role = 'viewer' } = req.body || {};
  if (!name?.trim() || !email?.trim() || typeof password !== 'string') return res.status(400).json({ message: 'Name, email and password are required' });
  if (password.length < 10) return res.status(400).json({ message: 'Password must be at least 10 characters' });
  if (!roles.includes(role)) return res.status(400).json({ message: 'Invalid role' });
  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return res.status(400).json({ message: 'Enter a valid email address' });
  if (await User.findOne({ email: normalized })) return res.status(409).json({ message: 'Email already registered' });
  const user = await User.create({ name: name.trim(), email: normalized, password: await bcrypt.hash(password, 12), role });
  await audit(req, 'USER_CREATED', user, { role }); res.status(201).json(safe(user));
}
export async function updateUser(req, res) {
  const { role, active, name } = req.body || {};
  if (role !== undefined && !roles.includes(role)) return res.status(400).json({ message: 'Invalid role' });
  if (active !== undefined && typeof active !== 'boolean') return res.status(400).json({ message: 'active must be a boolean' });
  const target = await User.findById(req.params.id);
  if (!target) return res.status(404).json({ message: 'User not found' });
  if (String(target._id) === req.user.id && (active === false || (role && role !== 'admin'))) return res.status(400).json({ message: 'You cannot disable yourself or remove your own admin role' });
  if (target.role === 'admin' && (role && role !== 'admin' || active === false)) {
    const otherAdmins = await User.countDocuments({ role: 'admin', active: true, _id: { $ne: target._id } });
    if (!otherAdmins) return res.status(400).json({ message: 'At least one active admin must remain' });
  }
  const before = { role: target.role, active: target.active };
  if (role) target.role = role; if (active !== undefined) target.active = active;
  if (name !== undefined) { if (!String(name).trim()) return res.status(400).json({ message: 'Name cannot be empty' }); target.name = String(name).trim(); }
  await target.save(); await audit(req, 'USER_UPDATED', target, { before, after: { role: target.role, active: target.active } });
  res.json(safe(target));
}
export async function resetPassword(req, res) {
  const { password } = req.body || {};
  if (typeof password !== 'string' || password.length < 10) return res.status(400).json({ message: 'Password must be at least 10 characters' });
  const user = await User.findById(req.params.id); if (!user) return res.status(404).json({ message: 'User not found' });
  user.password = await bcrypt.hash(password, 12); user.tokenVersion = (user.tokenVersion || 0) + 1; await user.save(); await audit(req, 'PASSWORD_RESET', user);
  res.json({ message: 'Password reset successfully' });
}
export async function listAuditLogs(req, res) {
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit || '100', 10) || 100, 1), 500);
  res.json(await AuditLog.find().sort({ timestamp: -1 }).limit(limit).lean());
}
