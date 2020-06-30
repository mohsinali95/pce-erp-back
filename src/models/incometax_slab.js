import mongoose from 'mongoose';
import { searchQueryV2, getCountOfRecordsV2 } from '../utilites/query-module';
import { TIME_STAMPES, FLAGS } from '../utilites/constants';
let ObjectId = mongoose.Schema.Types.ObjectId;

let incometaxSlabSchema = mongoose.Schema({

    taxable_range: {
        lower_limit: { type: Number },
        upper_limit: { type: Number }
    },
    tax_percent: { type: Number },
    status: FLAGS,
    timestamps: TIME_STAMPES
});
let IncometaxSlab = module.exports = mongoose.model('IncometaxSlab', incometaxSlabSchema);


function getQueryParams(queryParams) {

    let findParams = {
        'status.is_deleted': false,
    };
    return findParams;
}

module.exports.addTaxSlab = function (tax_slab) {
    return IncometaxSlab.create(tax_slab);
};

module.exports.getSpecificTaxSlab = function (param) {

    return IncometaxSlab.find(param)
        .lean(true);
};

module.exports.getTaxSlabs = function (queryParams) {

    let sortObj = {};
    if (queryParams.sort != '' && queryParams.sortby != '') {
        sortObj[queryParams.sort] = queryParams.sortby;
    }
    return searchQueryV2(IncometaxSlab, queryParams.limit, queryParams.page, sortObj, getQueryParams(queryParams), []);

}
module.exports.deleteTaxSlab = function (slab_id) {

    let updateDeleteFlag = {
        'status.is_deleted': true
    };
    return IncometaxSlab.updateOne({ _id: slab_id }, updateDeleteFlag);
}
module.exports.countSlabs = function (queryParams) {

    return getCountOfRecordsV2(IncometaxSlab, getQueryParams(queryParams));
}
module.exports.updateTaxSlab = function (updateParam, tax_slab) {

    tax_slab['timestamps.updated_at'] = new Date
    return IncometaxSlab.updateOne(updateParam, tax_slab);
}