import mongoose from 'mongoose';
import { TIME_STAMPES, FLAGS, DAYS } from '../utilites/constants';
import { searchQuery, getCountOfRecords, searchQueryV2 } from '../utilites/query-module';

let ObjectId = mongoose.Schema.Types.ObjectId;
/* 0 = Head Office, 1 = Region, 2 = Zone, 3 = Branch */
const UNIT_TYPES = [0, 1, 2, 3];

let unitSchema = mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    code: {
        type: String,
        required: true,
        unique: true
    },
    address: {
        type: String
    },
    email: {
        type: String,
    },
    phone_number: {
        type: String
    },
    prefix: {
        type: String,
    },
    
    unit_type: {
        type: Number,
        enum: UNIT_TYPES,
        required: true
    },
    configuration : {
        week_start : {
            type: String,
            enum : DAYS,
            default : 'Monday'
        },
        holidays : [{
            type: String,
            enum : DAYS
        }],
        /* 24 hours */
        working_hours : {

            from : {
                hour : {
                    type : String,
                    default : '09'
                },
                min : {
                    type : String,
                    default : '00'
                } 
            },
            to : {
                hour : {
                    type : String,
                    default : '18'
                },
                min : {
                    type : String,
                    default : '00'
                } 
            }
        }
    },
    parent_unit: {
        type: ObjectId,
        ref: 'Unit'
    },
    ancestors: [{ type: ObjectId, ref: 'Unit', default: undefined }],
    status: FLAGS,
    timestamps: TIME_STAMPES
});

let Unit = module.exports = mongoose.model('Unit', unitSchema);

function getQueryParams(queryParams) {


    let findParams = {};


    findParams = {
        'status.is_deleted': false
    }


    if (queryParams.startdate && queryParams.enddate) {
        findParams['timestamps.created_at'] = { "$gte": queryParams.startdate + ' 00:00:00', "$lt": queryParams.enddate + ' 23:59:00' }
    }

    if(queryParams.search){

        findParams['$or'] = [
            { name: { $regex: queryParams.search, $options: 'i' } },
            { code: { $regex: queryParams.search, $options: 'i' } },
            { address: { $regex: queryParams.search, $options: 'i' } },
            { phone_number: { $regex: queryParams.search, $options: 'i' } },
            { email: { $regex: queryParams.search, $options: 'i' } }
        ];

    }
    if(queryParams.status){

        findParams['status.is_activated'] =  queryParams.status;
    }

    if(queryParams.unit_type){

        findParams['unit_type'] =  queryParams.unit_type;
    }
    if(queryParams.parent_unit){
        findParams['parent_unit'] =  queryParams.parent_unit;
    }
    if(queryParams.ancestors){

        findParams['ancestors'] =  queryParams.ancestors;

    }
    return findParams;
}

module.exports.addManyUnits = function (units) {

    return Unit.insertMany(units);
 
};
module.exports.addUnit = function (unit, callback) {
    Unit.create(unit, callback);
};

module.exports.getUnit = function (queryParams, callback) {

    let sortObj = {};

    if (queryParams.sort != '' && queryParams.sortby != '') {
        sortObj[queryParams.sort] = queryParams.sortby;
    }
    searchQuery(Unit, callback, queryParams.limit, queryParams.page, sortObj, getQueryParams(queryParams), ['parent_unit']);

}

module.exports.getUnitV2 = function(queryParams = {}, populates = [], select_fields = ''){

    let sortObj = {};

    if (queryParams.sort != '' && queryParams.sortby != '') {
        sortObj[queryParams.sort] = queryParams.sortby;
    }
   return searchQueryV2(Unit, queryParams.limit, queryParams.page, sortObj, getQueryParams(queryParams),populates, select_fields);

}
module.exports.countUnit = function (queryParams, callback) {

    getCountOfRecords(Unit, callback, getQueryParams(queryParams));
}
module.exports.getSpecificUnit = function (param) {

    return Unit.find(param);
}
module.exports.updateUnit = function (param, unit) {

    unit['timestamps.updated_at'] = new Date
    return Unit.updateOne(param, unit);
}
module.exports.updateManyUnit = function (updateParam, data) {

    data['timestamps.updated_at'] = new Date;
    return Unit.updateMany(updateParam, data, { multi: true });
}
module.exports.deleteUnit = function (unitid, callback) {

    let updateDeleteFlag = {
        'status.is_deleted': true
    };
    Unit.updateOne({ _id: unitid }, updateDeleteFlag, callback);

}