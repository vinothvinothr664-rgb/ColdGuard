import mongoose from 'mongoose';
const schema=new mongoose.Schema({vehicleId:{type:String,unique:true},vehicleNumber:String,driverName:String,currentLocation:{latitude:Number,longitude:Number},shipmentId:String,temperature:Number,status:{type:String,enum:['AVAILABLE','ON_ROUTE','MAINTENANCE'],default:'AVAILABLE'}},{timestamps:true});
export default mongoose.model('Vehicle',schema);
