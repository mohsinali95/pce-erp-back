import mongoose from 'mongoose';
import { searchQuery, getCountOfRecords } from '../utilites/query-module';
let ObjectId = mongoose.Schema.Types.ObjectId;

let userDocumentSchema = mongoose.Schema({

    name: { type: String },
    document_required: { type: Boolean }

});
let UserDocument = module.exports = mongoose.model('UserDocument', userDocumentSchema);

module.exports.addUserDocument = function (document, callback) {
    
    UserDocument.create(document, callback);
}
module.exports.updateUserDocument = function (updateParam, document, callback) {

    UserDocument.updateOne(updateParam, document, callback);
}
module.exports.getUserDocuments = function (queryParams, callback) {
    
    searchQuery(UserDocument, callback, queryParams.limit, queryParams.page, {}, {}, [], '');
}
module.exports.countUserDocuments = function (param ,callback) {
    
    getCountOfRecords(UserDocument, callback, param);
}

