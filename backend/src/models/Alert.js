import mongoose from 'mongoose';
const schema=new mongoose.Schema({shipmentId:String,type:String,message:String,severity:{type:String,enum:['WARNING','CRITICAL']},temperature:Number,timestamp:{type:Date,default:Date.now},resolved:{type:Boolean,default:false},resolvedAt:Date},{timestamps:true});
export default mongoose.model('Alert',schema);
