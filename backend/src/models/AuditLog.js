import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  action: { type: String, required: true }, entity: { type: String, required: true },
  entityId: String, details: { type: mongoose.Schema.Types.Mixed, default: {} },
  userId: String, userEmail: String, timestamp: { type: Date, default: Date.now, index: true }
}, { timestamps: true });
export default mongoose.model('AuditLog', schema);
