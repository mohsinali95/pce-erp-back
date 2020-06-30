import mongoose from 'mongoose';
import { TIME_STAMPES, FLAGS, LOAN_STATUS } from '../utilites/constants';
import { getCountOfRecordsV2, searchQueryV2 } from '../utilites/query-module';

let ObjectId = mongoose.Schema.Types.ObjectId;

let employeeLoanSchema = mongoose.Schema({
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
    loan_amount: {
        total: {
            type: Number
        },
        paid: {
            type: Number
        }
    },
    installments: [{
        /* 0 For Jan && 11 For Dec */
        month: { type: String },
        year: { type: String },
        amount: { type: Number }
    }],
    loan_status: {
        type: Number,
        enum: LOAN_STATUS
    },
    loan_request: {
        type: ObjectId,
        ref: 'LoanRequest'
    },
    return_amount_logs: [
        {
            /* 0 For Jan && 11 For Dec */
            amount: { type: Number },
            month: { type: String },
            year: { type: String },
        }
    ],
    status: FLAGS,
    timestamps: TIME_STAMPES
});
let EmployeeLoan = module.exports = mongoose.model('EmployeeLoan', employeeLoanSchema);

function getQueryParams(queryParams) {

    let findParams = {
        'status.is_deleted': false,
    };
    if (queryParams.loan_status instanceof Array) {
        findParams['loan_status'] = { $in: queryParams.loan_status }
    }
    if (queryParams.employee) {
        findParams['employee'] = queryParams.employee
    }
    return findParams;

}

module.exports.addEmployeeLoan = function (data) {
    return EmployeeLoan.create(data);
};
module.exports.getSpecificEmployeeLoan = function (param, selectedFields) {

    return EmployeeLoan.find(param)
        .select(selectedFields)
        .populate('employee')
        .populate('loan_request')
        .lean(true);
}

module.exports.getEmployeeLoans = function (queryParams) {

    let sortObj = {};

    if (queryParams.sort != '' && queryParams.sortby != '') {
        sortObj[queryParams.sort] = queryParams.sortby;
    }
    const populateArray = [
        'loan_request',
        'employee',
    ];
    return searchQueryV2(EmployeeLoan, queryParams.limit, queryParams.page, sortObj, getQueryParams(queryParams), populateArray);

}

module.exports.countEmployeeLoans = function (queryParams = {}) {
    return getCountOfRecordsV2(EmployeeLoan, getQueryParams(queryParams));
};

module.exports.updateEmployeeLoan = function (updateParam, data) {

    data['timestamps.updated_at'] = new Date
    return EmployeeLoan.updateOne(updateParam, data);
} 