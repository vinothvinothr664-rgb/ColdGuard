import mongoose from 'mongoose';
const schema=new mongoose.Schema({shipmentId:{type:String,required:true,unique:true},productName:{type:String,required:true},source:String,destination:String,vehicleId:String,temperatureMin:{type:Number,default:2},temperatureMax:{type:Number,default:8},status:{type:String,enum:['PLANNED','IN_TRANSIT','DELIVERED','AT_RISK'],default:'PLANNED'}},{timestamps:true});
export default mongoose.model('Shipment',schema);
