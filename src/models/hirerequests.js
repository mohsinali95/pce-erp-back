import mongoose from 'mongoose';
import { searchQuery, getCountOfRecords } from '../utilites/query-module';
import { TIME_STAMPES, FLAGS, REQUEST_STATUS } from '../utilites/constants';

let ObjectId = mongoose.Schema.Types.ObjectId;

let hireRequestsSchema = mongoose.Schema({
    /* System Generated */
    job_id: {
        type: String,
        required: true,
        unique: true
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
    },
    closing_reason: {
        type: String
    },
    department: {
        type: ObjectId,
        ref: 'Department'
    },
    request_status: {
        type: Number,
        default: 0
    },
    request_next_order: {
        type: Number
    },
   /*  employees_count: {
        type: Number
    }, */
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
    extra_fields : [
        {
            title : {type : String},
            value : {type : String}
        }
    ],
    candidates: [
        {
            type: ObjectId,
            ref: 'Employee'
        }
    ],
    generated_by: {
        type: ObjectId,
        ref: 'Employee'
    },
    status: FLAGS,
    timestamps: TIME_STAMPES
});
let HireRequest = module.exports = mongoose.model('HireRequest', hireRequestsSchema);

function getQueryParams(queryParams) {

    let findParams = {
        'status.is_deleted': false,
    };
    if (queryParams.request_status instanceof Array) {

        findParams['request_status'] = { $in: queryParams.request_status }
    }

    return findParams;

}
module.exports.addHiringRequest = function (request, callback) {
    HireRequest.create(request, callback);
};
module.exports.countHiringRequests = function (queryParams = {}, callback) {
    getCountOfRecords(HireRequest, callback, getQueryParams(queryParams));
}

module.exports.updateHiringRequests = function (updateParam, hiringRequest, callback) {

    hiringRequest['timestamps.updated_at'] = new Date;
    HireRequest.updateMany(updateParam, hiringRequest, { multi: true }, callback);
}

module.exports.deleteHiringRequest = function (updateParamsObj, callback) {

    let updateDeleteFlag = {
        'status.is_deleted': true
    };
    HireRequest.updateOne(updateParamsObj, updateDeleteFlag, { multi: true }, callback);
}
module.exports.getSpecificHiringRequest = function (param, selectedFields = '', callback) {

    HireRequest.find(param, callback)
        .lean(true)
        .select(selectedFields)
        .populate({ path: 'candidates', populate: [{ path: 'hiring_details.reference_employee' }] })
        .populate({ path: 'department', populate: [{ path: 'unit_id' }, { path: 'manager' }] })
        .populate({ path: 'generated_by', populate: [{ path: 'basic_details.role' }] })
        .lean(true);
}
module.exports.getHiringRequests = function (queryParams, callback) {

    let sortObj = {};

    if (queryParams.sort != '' && queryParams.sortby != '') {
        sortObj[queryParams.sort] = queryParams.sortby;
    }

    let populateArray = [
        { path: 'department', populate: [{ path: 'unit_id' }] },
        { path: 'generated_by', populate: [{ path: 'basic_details.role' }] },
        'request_order'
    ];
    searchQuery(HireRequest, callback, queryParams.limit, queryParams.page, sortObj, getQueryParams(queryParams), populateArray, '');
}

module.exports.getApprovedHiringRequests = function (queryParams, callback) {

    let sortObj = {};
    let findParams = {
        'status.is_deleted': false,
        'request_status': 1

    };
    let selectFields = 'title job_id description -_id'
    searchQuery(HireRequest, callback, queryParams.limit, queryParams.page, sortObj, findParams, [], selectFields);

}

module.exports.updateHiringRequest = function (updateParam, data, callback) {

    data['timestamps.updated_at'] = new Date;
    HireRequest.updateOne(updateParam, data, callback);
}
