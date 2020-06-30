import mongoose from 'mongoose';
import { searchQueryV2, getCountOfRecordsV2 } from '../utilites/query-module';
import { TIME_STAMPES, FLAGS } from '../utilites/constants';
let ObjectId = mongoose.Schema.Types.ObjectId;

let advanceRequestSchema = mongoose.Schema({

    employee: { type: ObjectId, ref: 'Employee' },
    advance_amount: { type: Number },
    reason : {type : String},
    advance_for: {
       /* 0 For Jan && 11 For Dec */
        month: { type: String },
        year: { type: String }

    },
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
let AdvanceRequest = module.exports = mongoose.model('AdvanceRequest', advanceRequestSchema);


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

module.exports.createAdvRequest = function (request) {
    return AdvanceRequest.create(request);
};

module.exports.countAdvRequests = function (queryParams = {}) {
    return getCountOfRecordsV2(AdvanceRequest, getQueryParams(queryParams));
};

module.exports.getAdvRequests = function (queryParams) {

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
    return searchQueryV2(AdvanceRequest, queryParams.limit, queryParams.page, sortObj, getQueryParams(queryParams), populateArray);
}

module.exports.updateManyAdvRequests = function (updateParam, adv_request) {

    adv_request['timestamps.updated_at'] = new Date;
    return AdvanceRequest.updateMany(updateParam, adv_request, { multi: true });

}

module.exports.updateAdvRequest = function (updateParam, data) {

    data['timestamps.updated_at'] = new Date;
    return AdvanceRequest.update(updateParam, data);
};

module.exports.getSpecificAdvRequest = function (param, selectedFields = '') {

    return AdvanceRequest.find(param)
        .select(selectedFields)
        .populate('generated_by')
        .populate({ path: 'employee', populate: [{ path: 'employment_details.department' }, { path: 'employment_details.unit' }] })
        .populate('status_log.action_by')
        .lean(true);
};

module.exports.deleteAdvRequest = function (updateParamsObj) {

    let updateDeleteFlag = {
        'status.is_deleted': true
    };
    return AdvanceRequest.updateMany(updateParamsObj, updateDeleteFlag, { multi: true });
};