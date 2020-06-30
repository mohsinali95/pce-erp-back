import mongoose from 'mongoose';
import { TIME_STAMPES, FLAGS } from '../utilites/constants';
import { getCountOfRecordsV2, searchQueryV2 } from '../utilites/query-module';


let REQUEST_STATUS = mongoose.Schema(
    {
        name: { type: String },
        state: { type: Number }
    }
    , { _id: false });

let reportingLineSchema = mongoose.Schema({

    title: {
        type: String
    },
    request_status: [
        REQUEST_STATUS
    ],
    status: FLAGS,
    timestamps: TIME_STAMPES

});
let Reportingline = module.exports = mongoose.model('Reportingline', reportingLineSchema);

function getQueryParams(queryParams) {

    let findParams = {
        'status.is_deleted': false,
    };
    return findParams;
}
module.exports.addReportingline = function (data) {
    return Reportingline.create(data);
};
module.exports.getReportingline = function (queryParams) {

    let sortObj = {};
    if (queryParams.sort != '' && queryParams.sortby != '') {
        sortObj[queryParams.sort] = queryParams.sortby;
    }
    return searchQueryV2(Reportingline, queryParams.limit, queryParams.page, sortObj, getQueryParams(queryParams));
}
module.exports.countReportingline = function (queryParams) {
    return getCountOfRecordsV2(Reportingline, getQueryParams(queryParams));
}
module.exports.updateReportingline = function (param, data) {

    data['timestamps.updated_at'] = new Date
    return Reportingline.updateOne(param, data);
}
module.exports.deleteReportingline = function (d_id) {

    let updateDeleteFlag = {
        'status.is_deleted': true
    };
    return Reportingline.updateOne({ _id: d_id }, updateDeleteFlag);
}