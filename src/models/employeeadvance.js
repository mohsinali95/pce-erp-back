import mongoose from 'mongoose';
import { TIME_STAMPES, FLAGS, ADVANCE_STATUS } from '../utilites/constants';
import { getCountOfRecordsV2, searchQueryV2 } from '../utilites/query-module';

let ObjectId = mongoose.Schema.Types.ObjectId;

let employeeAdvanceSchema = mongoose.Schema({
    approved_date: {
        type: Date,
    },
    issued_date: {
        type: Date,
    },
    employee: {
        type: ObjectId,
        ref: 'Employee'
    },
    advance_status: {
        type: Number,
        enum: ADVANCE_STATUS
    },
    advance_amount: {
        type: Number
    },
    advance_request: {
        type: ObjectId,
        ref: 'AdvanceRequest'
    },
    advance_for: {
        /* 0 For Jan && 11 For Dec */
        month: { type: String },
        year: { type: String }

    },
    returned_on: {
         /* 0 For Jan && 11 For Dec */
        month: { type: String },
        year: { type: String }

    },
    status: FLAGS,
    timestamps: TIME_STAMPES
});
let EmployeeAdvance = module.exports = mongoose.model('EmployeeAdvance', employeeAdvanceSchema);

function getQueryParams(queryParams) {

    let findParams = {
        'status.is_deleted': false,
    };
    if (queryParams.advance_status instanceof Array) {
        findParams['advance_status'] = { $in: queryParams.advance_status }
    }
    if (queryParams.employee) {
        findParams['employee'] = queryParams.employee
    }
    return findParams;

}

module.exports.addEmployeeAdv = function (data) {
    return EmployeeAdvance.create(data);
};
module.exports.getSpecificEmployeeAdv = function (param, selectedFields = '') {

    return EmployeeAdvance.find(param)
        .select(selectedFields)
        /* .populate('employee')
        .populate('advance_request') */
        .lean(true);
}

module.exports.getEmployeeAdv = function () {

    let sortObj = {};

    if (queryParams.sort != '' && queryParams.sortby != '') {
        sortObj[queryParams.sort] = queryParams.sortby;
    }
    const populateArray = [
        'advance_request',
        'employee',
    ];
    return searchQueryV2(EmployeeAdvance, queryParams.limit, queryParams.page, sortObj, getQueryParams(queryParams), populateArray);

}

module.exports.countEmployeeAdv = function (queryParams = {}) {
    return getCountOfRecordsV2(EmployeeAdvance, getQueryParams(queryParams));
};

module.exports.updateEmployeeAdv = function (updateParam, data) {

    data['timestamps.updated_at'] = new Date
    return EmployeeAdvance.updateOne(updateParam, data);
} 