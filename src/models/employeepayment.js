import mongoose from 'mongoose';
import { TIME_STAMPES, FLAGS, LOAN_STATUS } from '../utilites/constants';
import { getCountOfRecordsV2, searchQueryV2 } from '../utilites/query-module';

let ObjectId = mongoose.Schema.Types.ObjectId;


const PAY_DETAILS = mongoose.Schema({
    include_gratuity: { type: Boolean },
    attendances: {
        attendance_types : [
            {
                attendance_type: { type: String },
                count: { type: Number }
            }
        ],
        total_days : { type: Number }

    },
    working_details: {
        total_time: { type: Number },
        given_time: { type: Number },
    },
    wage_details: {
        gross: { type: Number },
        net: { type: Number }
    },
    deductions: {
        fine: { type: Number },
        tax: { type: Number },
        absents: { type: Number },
        short_times: { type: Number },
        loan: { type: Number },
        advance: { type: Number },
    },
    additions: {
        gratuity: { type: Number },
        bonus: { type: Number },
        allowance: { type: Number },

    },
    bonuses: [
        {
            type: { type: String },
            amount: { type: String },
            is_included: { type: Boolean }
        }
    ],
    allowances: [
        {
            type: { type: String },
            amount: { type: String },
            is_included: { type: Boolean }
        }
    ],
    fines: [{type : ObjectId, ref : 'EmployeeFine'}],
    advances : [{type : ObjectId, ref : 'EmployeeAdvance'}],
    loans : [{type : ObjectId, ref : 'EmployeeLoan'}],
});

let employeePaymentSchema = mongoose.Schema({

    employee: {
        type: ObjectId,
        ref: 'Employee'
    },
    payroll:{
        type: ObjectId,
        ref: 'Payroll'
    },
    pay_details : PAY_DETAILS,
    status: FLAGS,
    timestamps: TIME_STAMPES

});

let EmployeePayment = module.exports = mongoose.model('EmployeePayment', employeePaymentSchema);

function getQueryParams(queryParams) {

    let findParams = {
        'status.is_deleted': false,
    };

    if(queryParams.employee){

        findParams['employee'] = queryParams.employee

    }

    if(queryParams.payroll){

        findParams['payroll'] = queryParams.payroll

    }
    
    return findParams;

}

module.exports.addManyEmployeePayments = function (payments) {

    return EmployeePayment.insertMany(payments);

};

module.exports.addEmployeePayment = function (data) {
    return EmployeePayment.create(data);
};

module.exports.getSpecificEmployeePayment = function (param, selectedFields) {

    return EmployeePayment.find(param)
        .select(selectedFields)
        .populate('employee')
        /* .populate('loan_request') */
        .lean(true);
}

module.exports.getEmployeePayments = function (queryParams, selected_fields = '') {

    let sortObj = {};

    if (queryParams.sort != '' && queryParams.sortby != '') {
        sortObj[queryParams.sort] = queryParams.sortby;
    }
    const populateArray = [
        { path: 'employee', populate: [{ path: 'employment_details.department' }, { path: 'employment_details.unit' }] },
        'payroll'
    ];
    return searchQueryV2(EmployeePayment, queryParams.limit, queryParams.page, sortObj, getQueryParams(queryParams), populateArray, selected_fields);

}

module.exports.countEmployeePayments = function (queryParams = {}) {
    return getCountOfRecordsV2(EmployeePayment, getQueryParams(queryParams));
};

module.exports.updateEmployeePayment = function (updateParam, data) {

    data['timestamps.updated_at'] = new Date
    return EmployeePayment.updateOne(updateParam, data);
}

