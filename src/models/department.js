import mongoose from 'mongoose';
import { searchQuery, getCountOfRecords } from '../utilites/query-module';
import { TIME_STAMPES, FLAGS, REQUEST_TYPE } from '../utilites/constants';

let ObjectId = mongoose.Schema.Types.ObjectId;

let PRIORITY_ORDER = mongoose.Schema({

    department : {
        type : ObjectId,
        ref : 'Department'
    },
    status: {
        type: Boolean,
        default: true
    }
}, { _id: false });


let departmentSchema = mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    code: {
        type: String,
        required: true,
        unique: true
    },
    prefix: {
        type: String,
    },
    unit_id: {
        type: ObjectId,
        ref: 'Unit'
    },
    is_parent:{
        type : Boolean,
        default : false
    },
    manager : {
        type: ObjectId,
        ref : 'Employee'
    },
    requestline : [{
        request_type : {
            type: String,
            enum: REQUEST_TYPE
        },
        priority_order: [PRIORITY_ORDER]
    }], 
    status: FLAGS,
    timestamps: TIME_STAMPES
});
let Department = module.exports = mongoose.model('Department', departmentSchema);
function getQueryParams(queryParams) {

    let findParams = {};
  
    findParams = {
        'status.is_deleted': false    
    };
    if (queryParams.search) {

        findParams['$or'] = [
            { name: { $regex: queryParams.search, $options: 'i' } },
            { code: { $regex: queryParams.search, $options: 'i' } },
            { prefix: { $regex: queryParams.search, $options: 'i' } }
        ];

    }
    if (queryParams.startdate && queryParams.enddate) {
        findParams['timestamps.created_at'] = { "$gte": queryParams.startdate + ' 00:00:00', "$lt": queryParams.enddate + ' 23:59:00' }
    }
    if (queryParams.status) {
        findParams['status.is_activated'] = queryParams.status;
    }
    if (queryParams.unit_id instanceof Array) {
       
        findParams['unit_id'] = { $in: queryParams.unit_id};
    }
    return findParams;

}
module.exports.addDepartment = function (department, callback) {

    Department.create(department, callback);
};
module.exports.getSpecificDepartment = function (param, callback) {

  Department.find(param, callback)
    .lean(true)
    .populate({path : 'requestline.priority_order.department', populate : [{path : 'unit_id'}, {path : 'manager'}]})
    .populate('unit_id')
}
module.exports.getSpecificDepartmentV2 = function (param) {

    return Department.find(param)
      .lean(true)
      .populate({path : 'requestline.priority_order.department', populate : [{path : 'unit_id'}, {path : 'manager'}]})
      .populate('unit_id')
}
module.exports.getDepartment = function (queryParams, callback) {

    let sortObj = {};

    if (queryParams.sort != '' && queryParams.sortby != '') {
        sortObj[queryParams.sort] = queryParams.sortby;
    }

    let populateArray = [
        'unit_id', 
        'manager'
    ]

    searchQuery(Department, callback, queryParams.limit, queryParams.page, sortObj, getQueryParams(queryParams),populateArray);

}
module.exports.countDepartment = function (queryParams, callback) {

    getCountOfRecords(Department, callback, getQueryParams(queryParams));
}
module.exports.updateDepartment = function (updateParam, department, callback) {

    department['timestamps.updated_at'] = new Date
    Department.updateOne(updateParam, department, callback);
}

module.exports.updateManyDepartment = function (updateParam, department) {

    department['timestamps.updated_at'] = new Date;
    return Department.updateMany(updateParam, department, { multi: true });
}
module.exports.deleteDepartment = function (departmentid, callback) {

    let updateDeleteFlag = {
        'status.is_deleted': true
    };
    Department.updateOne({ _id: departmentid }, updateDeleteFlag, callback);
}
