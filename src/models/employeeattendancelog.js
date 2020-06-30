import mongoose from 'mongoose';
import { TIME_STAMPES, FLAGS, LEAVE_TYPES } from '../utilites/constants';
import { getCountOfRecordsV2, searchQueryV2 } from '../utilites/query-module';

let ObjectId = mongoose.Schema.Types.ObjectId;

let employeeAttendanceLogSchema = mongoose.Schema({
    employeeNumber: {
        type: String
    },
    inOutMode: {
        type: String,
        enum: [0, 1, 4, 5]
    },
    attendanceDate : {type : Date}, 
    attendanceTime: {
        type: Date
    },
    status: FLAGS,
    timestamps: TIME_STAMPES
});

let EmployeeAttendanceLog = module.exports = mongoose.model('EmployeeAttendanceLog', employeeAttendanceLogSchema);

function getQueryParams(queryParams) {

    //console.log(queryParams);

    let findParams = {};
    findParams = {
        'status.is_deleted': false
    };

    if (queryParams.attendanceDate) {
        findParams['attendanceDate'] = { "$gte": queryParams.attendanceDate + ' 00:00:00', "$lt": queryParams.attendanceDate + ' 23:59:00' }
    }
    if (queryParams.employeeNumber) {
        findParams['employeeNumber'] = queryParams.employeeNumber
    }
    if (queryParams.inOutMode) {
        findParams['inOutMode'] = queryParams.inOutMode
    }
    /*  if(queryParams.employee_numbers instanceof Array){
 
         findParams['employee_number'] = { $in: queryParams.employee_numbers }
 
     } */
    return findParams;
}

module.exports.createManyEmployeeAttendanceLog = function (attendance_log) {

    return EmployeeAttendanceLog.insertMany(attendance_log);

};

module.exports.createEmployeeAttendanceLog = function (attendance_log) {

    return EmployeeAttendanceLog.create(attendance_log);

}

module.exports.updateEmployeeAttendanceLog = function (updateParam, attendance) {
    attendance['timestamps.updated_at'] = new Date
    return EmployeeAttendanceLog.updateOne(updateParam, attendance);
}

module.exports.updateManyEmployeeAttendanceLog = function (updateParam, data) {

    data['timestamps.updated_at'] = new Date;
    return EmployeeAttendanceLog.updateMany(updateParam, data, { multi: true });
}

module.exports.getEmployeeAttendanceLog = function (queryParams, select_fields = '') {

    let sortObj = {};

    if (queryParams.sort != '' && queryParams.sortby != '') {
        sortObj[queryParams.sort] = queryParams.sortby;
    }
    let populateArray = [];
    return searchQueryV2(EmployeeAttendanceLog, queryParams.limit, queryParams.page, sortObj, getQueryParams(queryParams), populateArray, select_fields);
}

module.exports.getSpecificEmployeeAttendanceLog = function (param, select_fields = '') {

    return EmployeeAttendanceLog.find(param)
        .lean(true)
        .select(select_fields);
}
