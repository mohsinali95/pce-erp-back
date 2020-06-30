import mongoose from 'mongoose';
import { TIME_STAMPES, FLAGS } from '../utilites/constants';
import { getCountOfRecordsV2, searchQueryV2 } from '../utilites/query-module';

let designationSchema = mongoose.Schema({

    title: {
        type: String
    },
    status: FLAGS,
    timestamps: TIME_STAMPES

});
let Designation = module.exports = mongoose.model('Designation', designationSchema);

function getQueryParams(queryParams) {

    let findParams = {
        'status.is_deleted': false,
    };
    return findParams;
}

module.exports.addDesgination = function (data) {
    return Designation.create(data);
};
module.exports.getDesignation = function (queryParams){

    let sortObj = {};
    if (queryParams.sort != '' && queryParams.sortby != '') {
        sortObj[queryParams.sort] = queryParams.sortby;
    }
    return searchQueryV2(Designation, queryParams.limit, queryParams.page, sortObj, getQueryParams(queryParams));
}
module.exports.countDesgination = function (queryParams) {
   return getCountOfRecordsV2(Designation,  getQueryParams(queryParams));
}
module.exports.updateDesignation = function (param, data) {

    data['timestamps.updated_at'] = new Date
    return Designation.updateOne(param, data);
}
module.exports.deleteDesignation = function (d_id) {

    let updateDeleteFlag = {
        'status.is_deleted': true
    };
   return Designation.updateOne({ _id: d_id }, updateDeleteFlag);

}



