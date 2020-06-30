import mongoose from 'mongoose';
import { searchQueryV2, getCountOfRecordsV2 } from '../utilites/query-module';
import { TIME_STAMPES, FLAGS } from '../utilites/constants';
let ObjectId = mongoose.Schema.Types.ObjectId;

let fineRequestSchema = mongoose.Schema({

    employee: { type: ObjectId, ref: 'Employee' },
    fine_type : {type : String},
    fine_amount : {type : String},
    reason : {type : String},
    applied_date: { type: Date },
    department: { type: ObjectId, ref: 'Department' },
    request_status: { type: Number, default: 0 },
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
let FineRequest = module.exports = mongoose.model('FineRequest', fineRequestSchema);


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

module.exports.createFineRequest = function (request) {
    return FineRequest.create(request);
};

module.exports.countFineRequests = function (queryParams = {}) {
    return getCountOfRecordsV2(FineRequest, getQueryParams(queryParams));
};

module.exports.getFineRequests = function (queryParams) {

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
    return searchQueryV2(FineRequest, queryParams.limit, queryParams.page, sortObj, getQueryParams(queryParams), populateArray);
}

module.exports.updateManyFineRequests = function (updateParam, fine_request) {

    fine_request['timestamps.updated_at'] = new Date;
    return FineRequest.updateMany(updateParam, fine_request, { multi: true });

}

module.exports.updateFineRequest = function (updateParam, data) {

    data['timestamps.updated_at'] = new Date;
    return FineRequest.update(updateParam, data);
};

module.exports.getSpecificFineRequest = function (param, selectedFields = '') {

    return FineRequest.find(param)
        .select(selectedFields)
        .populate('generated_by')
        .populate({ path: 'employee', populate: [{ path: 'employment_details.department' }, { path: 'employment_details.unit' }] })
        .populate('status_log.action_by')
        .lean(true);
};

module.exports.deleteFineRequest = function (updateParamsObj) {

    let updateDeleteFlag = {
        'status.is_deleted': true
    };
    return FineRequest.updateMany(updateParamsObj, updateDeleteFlag, { multi: true });
};