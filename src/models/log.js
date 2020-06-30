import mongoose from 'mongoose';
import { TIME_STAMPES } from '../utilites/constants';
let ObjectId = mongoose.Schema.Types.ObjectId;

let logSchema = mongoose.Schema({
    general_logs: { type: Object, time_stamps: TIME_STAMPES },
    system_logs: [{ type: Object, time_stamps: TIME_STAMPES }],

});
let Log = module.exports = mongoose.model('Log', logSchema);


module.exports.updateLog = function (updateQuery, callback) {

    /* Log.create(sys_log, callback); */
    /* Log['system_logs'].push(sys_log) */
    /* Log.updateOne({ system_logs: departmentId }, sys_log, callback); */
    /* Log.create({$push: {'system_logs': sys_log }}, callback); */
    /* Log.save(callback); */
    
    Log.updateOne({ _id: '000000000000000000000000' },updateQuery, callback)
};