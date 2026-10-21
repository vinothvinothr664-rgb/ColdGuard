import mongoose from 'mongoose';
const schema=new mongoose.Schema({shipmentId:{type:String,required:true,index:true},temperature:{type:Number,required:true},humidity:{type:Number,required:true},latitude:Number,longitude:Number,status:{type:String,enum:['NORMAL','WARNING','CRITICAL'],required:true},timestamp:{type:Date,default:Date.now},anomaly:Boolean,riskScore:Number,anomalyReason:String},{timestamps:true});
schema.index({shipmentId:1,timestamp:-1});
export default mongoose.model('SensorReading',schema);
