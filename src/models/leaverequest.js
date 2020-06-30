import mongoose from 'mongoose';
import { searchQuery, getCountOfRecords } from '../utilites/query-module';
import { TIME_STAMPES, FLAGS, LEAVE_TYPES } from '../utilites/constants';

let ObjectId = mongoose.Schema.Types.ObjectId;

let leaveRequestSchema = mongoose.Schema({

    leave_type: { type: String, enum: LEAVE_TYPES },
    from: { type: Date },
    to: { type: Date },
    between_dates: [
        { type: Date }
    ],
    reason: { type: String },
    days: { type: Number },
    request_status: { type: Number, default: 0 },
    employee: { type: ObjectId, ref: 'Employee' },
    department: { type: ObjectId, ref: 'Department' },
    replacement_employee: { type: ObjectId, ref: 'Employee' },
    request_next_order: { type: Number },
    status_log: [
        {
            status: {
                type: Number,
            },
            action_by: {
                type: ObjectId,
                ref: 'Employee'
            },
            updated_at: {
                type: Date,
                default: Date.now
            }
        }
    ],
    generated_by: { type: ObjectId, ref: 'Employee' },
    closing_reason: {
        type: String
    },
    leaves_summary: [
        {
            leave_type: { type: String, enum: LEAVE_TYPES },
            current_balance: { type: Number },
            remaining_balance : { type: Number }
        }
    ],
    status: FLAGS,
    timestamps: TIME_STAMPES
});
let LeaveRequest = module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);

function getQueryParams(queryParams) {

    let findParams = {
        'status.is_deleted': false,
    };
    if (queryParams.request_status instanceof Array) {
        findParams['request_status'] = { $in: queryParams.request_status }
    }
    if (queryParams.from && queryParams.to) {
        findParams['$or'] = [
            { 'between_dates': queryParams.from },
            { 'between_dates': queryParams.to }
        ]
    }
    if (queryParams.employee) {

        findParams['employee'] = queryParams.employee

    }
    return findParams;

}
module.exports.addLeaveRequest = function (request, callback) {
    LeaveRequest.create(request, callback);
};
module.exports.countLeaveRequests = function (queryParams = {}, callback) {
    getCountOfRecords(LeaveRequest, callback, getQueryParams(queryParams));
};
module.exports.updateManyLeaveRequests = function (updateParam, leaverequest, callback) {

    leaverequest['timestamps.updated_at'] = new Date;
    LeaveRequest.updateMany(updateParam, leaverequest, { multi: true }, callback);
}
module.exports.deleteLeaveRequest = function (updateParamsObj, callback) {

    let updateDeleteFlag = {
        'status.is_deleted': true
    };
    LeaveRequest.updateMany(updateParamsObj, updateDeleteFlag, { multi: true }, callback);
};
module.exports.getSpecificLeaveRequest = function (param, selectedFields = '') {

    return LeaveRequest.find(param)
        .select(selectedFields)
        .populate('generated_by')
        .populate({ path: 'employee', populate: [{ path: 'employment_details.department' }, { path: 'employment_details.unit' }] })
        .populate('status_log.action_by')
        .lean(true);
}
module.exports.getLeaveRequests = function (queryParams, callback) {

    let sortObj = {};

    if (queryParams.sort != '' && queryParams.sortby != '') {
        sortObj[queryParams.sort] = queryParams.sortby;
    }
    const populateArray = [
        'generated_by',
        'status_log.action_by',
        'replacement_employee',
        { path: 'department', populate: [{ path: 'unit_id' }] },
        { path: 'employee', populate: [{ path: 'employment_details.department' }] }
    ]
    searchQuery(LeaveRequest, callback, queryParams.limit, queryParams.page, sortObj, getQueryParams(queryParams), populateArray);
}

module.exports.updateLeaveRequest = function (updateParam, data, callback) {

    data['timestamps.updated_at'] = new Date;
    LeaveRequest.update(updateParam, data, callback);
};
