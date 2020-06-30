import mongoose from 'mongoose';
import { searchQuery, getCountOfRecords } from '../utilites/query-module';
import { TIME_STAMPES, FLAGS, SYSTEM_ROLES } from '../utilites/constants';
let CRUD = {
    c: { type: Boolean, default: false },
    r: { type: Boolean, default: false },
    u: { type: Boolean, default: false },
    d: { type: Boolean, default: false },
}
let roleSchema = mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    permissions: {
        role: CRUD,
        employee: CRUD,
        department: CRUD,
        unit: CRUD,
        requestline: CRUD,
        hiringrequest: CRUD,
        leaverequest: CRUD,
        transferrequest: CRUD,
        attendance: CRUD,
        attendancerequest: CRUD,
        loanrequest: CRUD,
        advancerequest: CRUD,
        designation: CRUD,
        taxslab: CRUD,
        finerequest: CRUD,
        payroll: CRUD
    },
    status: FLAGS,
    timestamps: TIME_STAMPES
});

let Role = module.exports = mongoose.model('Role', roleSchema);
function getQueryParams(queryParams) {

    let findParams = {
        'status.is_deleted': false,
        'name': { $nin: SYSTEM_ROLES }
    };
    return findParams;
}
module.exports.addRole = function (role, callback) {
    Role.create(role, callback);
};
module.exports.getSpecificRole = function (param, callback) {
    Role.find(param, callback);
}
module.exports.getRoles = function (queryParams, callback) {

    let sortObj = {};
    if (queryParams.sort != '' && queryParams.sortby != '') {
        sortObj[queryParams.sort] = queryParams.sortby;
    }
    searchQuery(Role, callback, queryParams.limit, queryParams.page, sortObj, getQueryParams(queryParams));
}
module.exports.countRoles = function (queryParams, callback) {
    getCountOfRecords(Role, callback, getQueryParams());
}
module.exports.updateRole = function (role, callback) {

    let role_id = role._id;

    let update = {
        'name': role.name,
        'permissions': role.permissions,
        'timestamps.updated_at': new Date()
    };
    Role.update({ _id: role_id }, update, callback);
}
module.exports.deleteRole = function (roleid, callback) {

    let updateDeleteFlag = {
        'status.is_deleted': true
    };
    Role.updateOne({ _id: roleid }, updateDeleteFlag, callback);
}