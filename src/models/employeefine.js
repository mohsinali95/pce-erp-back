import mongoose from 'mongoose';
import { TIME_STAMPES, FLAGS, FINE_STATUS } from '../utilites/constants';
import { getCountOfRecordsV2, searchQueryV2 } from '../utilites/query-module';

let ObjectId = mongoose.Schema.Types.ObjectId;

let employeeFineSchema = mongoose.Schema({
    approved_date: {
        type: Date,
    },
    paid : {
        /* 0 For Jan && 11 For Dec */
        month : {type : String},
        year : {type : String}
    },
    employee: {
        type: ObjectId,
        ref: 'Employee'
    },
    fine_status: {
        type: Number,
        enum: FINE_STATUS
    },
    fine_request: {
        type: ObjectId,
        ref: 'FineRequest'
    },
    type : {type : String},
    amount : {type : String},
    reason : {type : String},
    status: FLAGS,
    timestamps: TIME_STAMPES
});
let EmployeeFine = module.exports = mongoose.model('EmployeeFine', employeeFineSchema);

function getQueryParams(queryParams) {

    let findParams = {
        'status.is_deleted': false,
    };
    if (queryParams.fine_status instanceof Array) {
        findParams['fine_status'] = { $in: queryParams.fine_status }
    }
    if (queryParams.employee) {
        findParams['employee'] = queryParams.employee
    }
    return findParams;

}

module.exports.addEmployeeFine = function (data) {
    return EmployeeFine.create(data);
};
module.exports.getSpecificEmployeeFine = function (param, selectedFields) {

    return EmployeeFine.find(param)
        .select(selectedFields)
        /* .populate('employee')
        .populate('fine_request') */
        .lean(true);
}

module.exports.getEmployeeFine = function () {

    let sortObj = {};

    if (queryParams.sort != '' && queryParams.sortby != '') {
        sortObj[queryParams.sort] = queryParams.sortby;
    }
    const populateArray = [
        'fine_request',
        'employee',
    ];
    return searchQueryV2(EmployeeFine, queryParams.limit, queryParams.page, sortObj, getQueryParams(queryParams), populateArray);

}

module.exports.countEmployeeFine = function (queryParams = {}) {
    return getCountOfRecordsV2(EmployeeFine, getQueryParams(queryParams));
};

module.exports.updateEmployeeFine = function (updateParam, data) {

    data['timestamps.updated_at'] = new Date
    return EmployeeFine.updateOne(updateParam, data);
} 