import mongoose from 'mongoose';
import { searchQuery, getCountOfRecordsV2 } from '../utilites/query-module';
import { TIME_STAMPES, FLAGS, TRANSFER_TYPES } from '../utilites/constants';
let ObjectId = mongoose.Schema.Types.ObjectId;

let transferRequestSchema = mongoose.Schema({
    /* System Generated */
    transfer_id: {
        type: String,
        required: true,
        unique: true
    },
    transfer_type: {
        type: String,
        required: true,
        enum: TRANSFER_TYPES
    },
    transfer_date: {
        type: Date
    },
    transfer_from_date: {
        type: Date
    },
    transfer_to_date: {
        type: Date
    },
    last_transfer_date : {
        type: Date
    },
    transfer_reason: {
        type: String
    },
    closing_reason: {
        type: String
    },
    transfer_details: {
       transfer_to : {
        unit: {
            type: ObjectId,
            ref: 'Unit'
        },
        department: {
            type: ObjectId,
            ref: 'Department'
        }
       },
       transfer_from : {
        unit: {
            type: ObjectId,
            ref: 'Unit'
        },
        department: {
            type: ObjectId,
            ref: 'Department'
        }
       } 
    },
    transfer_for_employee: {
        type: ObjectId,
        ref: 'Employee'
    },
    replacement_employee: { type: ObjectId, ref: 'Employee', default: null },
    request_status: {
        type: Number,
        default: 0
    },
    is_urgent : {
        type : Boolean,
        default: false
    },
    request_next_order: {
        type: Number
    },
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
    generated_by: {
        type: ObjectId,
        ref: 'Employee'
    },
   /*  is_current : {
        type : Boolean,
        default : false
    }, */
    /* Department For Reportingline */
    department : {
        type: ObjectId,
        ref: 'Department'
    },
    status: FLAGS,
    timestamps: TIME_STAMPES
});
let TransferRequest = module.exports = mongoose.model('TransferRequest', transferRequestSchema);

function getQueryParams(queryParams) {

    let findParams = {
        'status.is_deleted': false,
    };
    if (queryParams.request_status instanceof Array) {
        findParams['request_status'] = { $in: queryParams.request_status }
    }
    if (queryParams.transfer_to_date) {
        findParams['transfer_to_date'] = { "$gte": queryParams.transfer_to_date + ' 00:00:00', "$lt": queryParams.transfer_to_date + ' 23:59:00' }
    }
    if(queryParams.transfer_type){
        findParams['transfer_type'] = queryParams.transfer_type
    }
    if(queryParams.employee){
        findParams['transfor_for_employee'] = queryParams.employee


    }
    return findParams;

}

module.exports.addTransferRequest = function (request, callback) {
    TransferRequest.create(request, callback);
}

module.exports.countTransferRequests = function (queryParams = {}) {
    return getCountOfRecordsV2(TransferRequest, getQueryParams(queryParams));
}

module.exports.updateManyTransferRequests = function (updateParam, transferRequest, callback) {

    transferRequest['timestamps.updated_at'] = new Date;
    TransferRequest.updateMany(updateParam, transferRequest, { multi: true }, callback);
}
module.exports.updateTransferRequest = function (updateParam, data, callback) {

    data['timestamps.updated_at'] = new Date;
    TransferRequest.updateOne(updateParam, data, callback);
}
module.exports.deleteTransferRequest = function (updateParamsObj, callback) {

    let updateDeleteFlag = {
        'status.is_deleted': true
    };
    TransferRequest.updateOne(updateParamsObj, updateDeleteFlag, callback);
}

module.exports.getTransferRequests = function (queryParams, callback) {

    let sortObj = {};

    if (queryParams.sort != '' && queryParams.sortby != '') {
        sortObj[queryParams.sort] = queryParams.sortby;
    }

    let populateArray = [
        { path: 'department', populate: [{ path: 'unit_id' }] },
        { path: 'generated_by', populate: [{ path: 'basic_details.role' }] },
        'transfer_details.transfer_from.department',
        'transfer_details.transfer_from.unit',
        'transfer_details.transfer_to.unit',
        'transfer_details.transfer_to.department',
        'replacement_employee',
        { path: 'transfer_for_employee', populate: [{ path: 'employment_details.unit' }, { path: 'employment_details.department' }] }

    ];
    searchQuery(TransferRequest, callback, queryParams.limit, queryParams.page, sortObj, getQueryParams(queryParams), populateArray, '');
}

module.exports.getSpecificTransferRequest = function (param, selectedFields = '') {

    return TransferRequest.find(param)
        .select(selectedFields)
        .populate('generated_by')
        .populate('transfer_details.transfer_from.department')
        .populate('transfer_details.transfer_from.unit')
        .populate('transfer_details.transfer_to.department')
        .populate('transfer_details.transfer_to.unit')
        .populate({ path: 'transfer_for_employee', populate: [{ path: 'employment_details.unit' }, { path: 'employment_details.department' }] })
        .populate('status_log.action_by')
        .lean(true);
}

