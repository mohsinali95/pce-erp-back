import mongoose from 'mongoose';
import { searchQueryV2, getCountOfRecordsV2 } from '../utilites/query-module';
import { TIME_STAMPES, FLAGS, LOAN_TYPES } from '../utilites/constants';

let ObjectId = mongoose.Schema.Types.ObjectId;

let LoanRequestSchema = mongoose.Schema({

    loan_type: { type: String, enum: LOAN_TYPES },
    loan_date: { type: Date },
    loan_amount: { type: Number },
    /* approved_on: { type: Date }, */
    reason: { type: String },
    number_of_months: { type: Number },
    installments: [{
        /* 0 For Jan && 11 For Dec */
        month: { type: String },
        year: { type: String },
        amount: { type: Number }
    }],
    guarantor: {

        firstname: { type: String },
        lastname: { type: String },
        cnic: { type: String },
        contact: { type: String },
        address: { type: String },
        front_cnic: { type: String },
        back_cnic: { type: String }
    },
    request_status: { type: Number, default: 0 },
    employee: { type: ObjectId, ref: 'Employee' },
    department: { type: ObjectId, ref: 'Department' },
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
    closing_reason: { type: String },
    status: FLAGS,
    timestamps: TIME_STAMPES
});
let LoanRequest = module.exports = mongoose.model('LoanRequest', LoanRequestSchema);

function getQueryParams(queryParams) {

    let findParams = {
        'status.is_deleted': false,
    };
    if (queryParams.request_status instanceof Array) {
        findParams['request_status'] = { $in: queryParams.request_status }
    }
    if (queryParams.employee) {
        findParams['employee'] = queryParams.employee
    }
    return findParams;

}

module.exports.addLoanRequest = function (request) {
    return LoanRequest.create(request);
};

module.exports.countLoanRequests = function (queryParams = {}) {
    return getCountOfRecordsV2(LoanRequest, getQueryParams(queryParams));
};


module.exports.getLoanRequests = function (queryParams) {

    let sortObj = {};

    if (queryParams.sort != '' && queryParams.sortby != '') {
        sortObj[queryParams.sort] = queryParams.sortby;
    }
    const populateArray = [
        'generated_by',
        'status_log.action_by',
        { path: 'department', populate: [{ path: 'unit_id' }] },
        { path: 'employee', populate: [{ path: 'employment_details.department' }] }
    ]
    return searchQueryV2(LoanRequest, queryParams.limit, queryParams.page, sortObj, getQueryParams(queryParams), populateArray);
}

module.exports.updateManyLoanRequests = function (updateParam, loan_request) {

    loan_request['timestamps.updated_at'] = new Date;
    return LoanRequest.updateMany(updateParam, loan_request, { multi: true });

}

module.exports.updateLoanRequest = function (updateParam, data) {

    data['timestamps.updated_at'] = new Date;
    return LoanRequest.update(updateParam, data);
};

module.exports.getSpecificLoanRequest = function (param, selectedFields = '') {

    return LoanRequest.find(param)
        .select(selectedFields)
        .populate('generated_by')
        .populate({ path: 'employee', populate: [{ path: 'employment_details.department' }, { path: 'employment_details.unit' }] })
        .populate('status_log.action_by')
        .lean(true);
}

module.exports.deleteLoanRequest = function (updateParamsObj) {

    let updateDeleteFlag = {
        'status.is_deleted': true
    };
    return LoanRequest.updateMany(updateParamsObj, updateDeleteFlag, { multi: true });
};