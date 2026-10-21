import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  location: { type: String, required: true, trim: true, maxlength: 200 },
  capacity: { type: Number, required: true, min: 0.01 },
  capacityUnit: { type: String, required: true, trim: true, maxlength: 20, default: 'pallets' },
  status: { type: String, enum: ['ACTIVE', 'MAINTENANCE', 'INACTIVE'], default: 'ACTIVE' },
  shipmentIds: { type: [String], default: [] }
}, { timestamps: true });

schema.index({ name: 1 });

export default mongoose.model('Warehouse', schema);
