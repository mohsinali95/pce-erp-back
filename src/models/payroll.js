import mongoose from 'mongoose';
import { TIME_STAMPES, FLAGS } from '../utilites/constants';
import { getCountOfRecordsV2, searchQueryV2 } from '../utilites/query-module';

let ObjectId = mongoose.Schema.Types.ObjectId;


let payrollSchema = mongoose.Schema({

    start_date: {
        type: Date,
    },
    end_date: {
        type: Date,
    },
    payroll_name: {
        type: String,
        required: true

    },
    for_month: {
        /* 0 For Jan && 11 For Dec */
        month: { type: String },
        year: { type: String }
    },
    /* SYSTEM GENERATED */
    payroll_id : {
        type: String,
        required: true,
        unique : true
    },
    status: FLAGS,
    timestamps: TIME_STAMPES

});

let Payroll = module.exports = mongoose.model('Payroll', payrollSchema);

function getQueryParams(queryParams) {

    let findParams = {
        'status.is_deleted': false,
    };

    if(queryParams.month && queryParams.year){


        findParams['for_month.month'] = queryParams.month;
        findParams['for_month.year'] = queryParams.year;
    }

    if(queryParams.payroll_id){

        findParams['payroll_id'] = queryParams.payroll_id;
    }
    
    return findParams;

}

module.exports.createPayroll = function (payroll) {
  return Payroll.create(payroll);
};

module.exports.getSpecificPayroll = function (param, selectedFields) {

    return Payroll.find(param)
        .select(selectedFields)
        .lean(true);
}

module.exports.getPayrolls = function (queryParams) {

    let sortObj = {};

    if (queryParams.sort != '' && queryParams.sortby != '') {
        sortObj[queryParams.sort] = queryParams.sortby;
    }
    const populateArray = [
        /* 'loan_request',
        'employee', */
    ];
    return searchQueryV2(Payroll, queryParams.limit, queryParams.page, sortObj, getQueryParams(queryParams), populateArray);

}

module.exports.countPayrolls = function (queryParams = {}) {
    return getCountOfRecordsV2(Payroll, getQueryParams(queryParams));
};

module.exports.updatePayroll = function (updateParam, data) {

    data['timestamps.updated_at'] = new Date
    return Payroll.updateOne(updateParam, data);
} 