import mongoose from 'mongoose';
import { searchQuery, getCountOfRecords, getCountOfRecordsV2, searchQueryV2 } from '../utilites/query-module';
import { TIME_STAMPES, FLAGS, LEAVE_TYPES } from '../utilites/constants';

let ObjectId = mongoose.Schema.Types.ObjectId;

let attendanceChangeRequestSchema = mongoose.Schema({

    generated_by: { type: ObjectId, ref: 'Employee' },
    change_in_employee: { type: ObjectId, ref: 'Employee' },
    department: { type: ObjectId, ref: 'Department' },
    attendance_for: { month: { type: String }, year: { type: String } },
    attendance_date: { type: String },
    attendance_type: { type: String },
    change_request_time: {
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
    },
    current_time: {
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
    },
    request_status: { type: Number, default: 0 },
    remarks: { type: String },
    status: FLAGS,
    timestamps: TIME_STAMPES
});
let AttendanceChangeRequest = module.exports = mongoose.model('AttendanceChangeRequest', attendanceChangeRequestSchema);

function getQueryParams(queryParams) {

    let findParams = {
        'status.is_deleted': false,
    };
    if (queryParams.request_status instanceof Array) {
        findParams['request_status'] = { $in: queryParams.request_status }
    }
    if (queryParams.employee) {
        findParams['change_in_employee'] = queryParams.employee;
    }
    return findParams;

}
module.exports.createAttendanceChangeRequest = function (request, callback) {
    AttendanceChangeRequest.create(request, callback);
};
module.exports.countAttendanceChangeRequests = function (queryParams = {}) {
    return getCountOfRecordsV2(AttendanceChangeRequest, getQueryParams(queryParams));
};
module.exports.deleteAttendanceChangeRequest = function (updateParamsObj, callback) {

    let updateDeleteFlag = {
        'status.is_deleted': true
    };
    AttendanceChangeRequest.update(updateParamsObj, updateDeleteFlag, { multi: true }, callback);
};
module.exports.getSpecificAttendanceChangeRequest = function (param, selectedFields = '') {

   return AttendanceChangeRequest.find(param)
        .select(selectedFields)
        .populate('generated_by')
        .populate('department')
        .lean(true);
}
module.exports.getAttendanceChangeRequests = function (queryParams) {

    let sortObj = {};

    if (queryParams.sort != '' && queryParams.sortby != '') {
        sortObj[queryParams.sort] = queryParams.sortby;
    }
    const populateArray = [
        { path: 'generated_by', select: ['basic_details', 'employment_details'] },
        { path: 'department', populate: [{ path: 'unit_id' }] },
        { path: 'change_in_employee', select: ['basic_details', 'employment_details'], populate: [{ path: 'employment_details.department' }] }
    ];
    return searchQueryV2(AttendanceChangeRequest, queryParams.limit, queryParams.page, sortObj, getQueryParams(queryParams), populateArray);
}

module.exports.updateAttendanceChangeRequest = function (updateParam, data, callback) {

    data['timestamps.updated_at'] = new Date;
    AttendanceChangeRequest.update(updateParam, data, callback);
};