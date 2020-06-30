import mongoose from 'mongoose';
import { TIME_STAMPES, FLAGS } from '../utilites/constants';
import { searchQuery, getCountOfRecords, searchQueryV2 } from '../utilites/query-module';

let ObjectId = mongoose.Schema.Types.ObjectId;

// let FINGERPRINT_DATA = mongoose.Schema({
//     finger_print_template : { type: String }
// });

let employeeFingerprintSchema = mongoose.Schema({
    employee_number: {
        type: String,
        //ref : 'Employee',
        required: true
    },
    fingerprint_data: [{
        type: String
    }],
    status: FLAGS,
    timestamps: TIME_STAMPES
});

let EmployeeFingerprint = module.exports = mongoose.model('EmployeeFingerprint', employeeFingerprintSchema);

module.exports.addManyEmployeeFingerprints = function (employees) {

    return EmployeeFingerprint.insertMany(employees);

};
module.exports.addEmployeeFingerprint = function (data) {
    return EmployeeFingerprint.create(data);
};

module.exports.getSpecificEmployeeFingerprint = function (param) {

    return EmployeeFingerprint.find(param)
        .lean(true);
}

module.exports.updateEmployeeFingerprint = function (updateParam, data) {

    data['timestamps.updated_at'] = new Date
    return EmployeeFingerprint.updateOne(updateParam, data);
}