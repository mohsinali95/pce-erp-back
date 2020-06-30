import mongoose from 'mongoose';
import { TIME_STAMPES, FLAGS, LEAVE_TYPES } from '../utilites/constants';
import { searchQuery, getCountOfRecords, searchQueryV2 } from '../utilites/query-module';

let ObjectId = mongoose.Schema.Types.ObjectId;
let StringId = mongoose.Schema.Types.String;

let ATTENDANCE_DETAILS = mongoose.Schema({
    
    month: {
        type: String
    },
    year: {
        type: String
    },
    total_extra_hours: {
        type: String
    },
    total_service_hours: {
        type: String
    },
    total_required_hours : { type: String },
    /* leaves_history: [{
        leave_type: {
            type: String,
            enum: LEAVE_TYPES
        },
        used: { type: Number }
    }], */
    attendances: [{

        attendance_type: {
            type: String,
            
        },
        attendance_date: { type: String },
        remarks: { type: String },
        time_in: {
            hour: {
                type: String
            },
            min: {
                type: String
            }
        },
        time_out: {
            hour: {
                type: String
            },
            min: {
                type: String
            }
        },
        service_hours: {
            type: String
        },
        extra_hours: {
            type: String
        }
    }]
})

let employeeAttendanceSchema = mongoose.Schema({
    employee_number : {
        type : StringId,
        ref : 'Employee'
    },
    attendance_details : [ATTENDANCE_DETAILS],
    status: FLAGS,
    timestamps: TIME_STAMPES
});

let EmployeeAttendance = module.exports = mongoose.model('EmployeeAttendance', employeeAttendanceSchema);

function getQueryParams(queryParams) {

    let findParams = {};
    findParams = {
        'status.is_deleted': false  
    };


    if(queryParams.employee_numbers instanceof Array){

        findParams['employee_number'] = { $in: queryParams.employee_numbers }

    }
   /*  if(queryParams.month && queryParams.year){

        findParams['attendance_details.month'] = queryParams.month;
        findParams['attendance_details.year'] = queryParams.year;


    } */
    return findParams;
}

module.exports.addManyEmployeeAttendance = function (emp_attendance) {

    return EmployeeAttendance.insertMany(emp_attendance);

};

module.exports.createEmployeeAttendance = function(employee){

    return EmployeeAttendance.create(employee);

}

module.exports.updateEmployeeAttendance = function (updateParam, attendance, callback) {
    attendance['timestamps.updated_at'] = new Date
    return EmployeeAttendance.updateOne(updateParam, attendance);
}

module.exports.updateManyEmployeeAttendance = function (updateParam, data) {

    data['timestamps.updated_at'] = new Date;
    return EmployeeAttendance.updateMany(updateParam, data, { multi: true });
}

module.exports.getEmployeeAttendance = function (queryParams, select_fields = '') {

    let sortObj = {};

    if (queryParams.sort != '' && queryParams.sortby != '') {
        sortObj[queryParams.sort] = queryParams.sortby;
    }
    let populateArray = [];

    return searchQueryV2(EmployeeAttendance, queryParams.limit, queryParams.page, sortObj, getQueryParams(queryParams), populateArray, select_fields);
}

module.exports.getSpecificEmployeeAttendance = function (param, select_fields = '') {

    return EmployeeAttendance.find(param)
        .lean(true)
        .select(select_fields);
}
