import mongoose from 'mongoose';
import { TIME_STAMPES, FLAGS } from '../utilites/constants';
import { getCountOfRecordsV2, searchQueryV2 } from '../utilites/query-module';
let ObjectId = mongoose.Schema.Types.ObjectId;

let employmentDurationSchema = mongoose.Schema({

    employee: {
        type: ObjectId,
        ref: 'Employee'
    },
    employment_count: {
        type: Number
    },
    activation_date: {
        type: Date
    },
    deactivation_date: {
        type: Date
    },
    duration : {
        type : String
    },
    status: FLAGS,
    timestamps: TIME_STAMPES

});
let EmploymentDuration = module.exports = mongoose.model('EmploymentDuration', employmentDurationSchema);

function getQueryParams(queryParams) {

    let findParams = {
        'status.is_deleted': false,
    };
    if(queryParams.employee){

        findParams['employee'] = queryParams.employee

    }

    console.log(findParams);
    return findParams;
}

module.exports.addEmploymentDuration = function (data) {
    return EmploymentDuration.create(data);
};
module.exports.getEmploymentDuration = function (queryParams){

    let sortObj = {};
    if (queryParams.sort != '' && queryParams.sortby != '') {
        sortObj[queryParams.sort] = queryParams.sortby;
    }
    return searchQueryV2(EmploymentDuration, queryParams.limit, queryParams.page, sortObj, getQueryParams(queryParams), ['employee']);
}

module.exports.getSpecificEmploymentDuration = function (param, select_fields = ''){

    return EmploymentDuration.find(param)
    .lean(true)
    .select(select_fields)
    .populate('employee')
    
   
}
module.exports.countEmploymentDuration = function (queryParams) {
   return getCountOfRecordsV2(EmploymentDuration,  getQueryParams(queryParams));
}
module.exports.updateEmploymentDuration = function (param, data) {

    data['timestamps.updated_at'] = new Date
    return EmploymentDuration.updateOne(param, data);
}
module.exports.deleteEmploymentDuration = function (id) {

    let updateDeleteFlag = {
        'status.is_deleted': true
    };
   return EmploymentDuration.updateOne({ _id: id }, updateDeleteFlag);

}


