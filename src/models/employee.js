import mongoose from 'mongoose';
import { searchQueryV2, getCountOfRecordsV2 } from '../utilites/query-module';
import { GENDER_TYPE, TIME_STAMPES, EMPLOYEE_TYPE, ASSET_STATUS, EMPLOYEE_STATUS, LEAVE_TYPES, SYSTEM_EMPLOYEES } from '../utilites/constants';
let ObjectId = mongoose.Schema.Types.ObjectId;

let BASIC_DETAILS = mongoose.Schema({
    firstname: { type: String },
    lastname: { type: String },
    cnic: { type: String, required: true, unique: true },
    email: { type: String/* , unique: true */ },
    dob: { type: Date },
    contact_one: { type: String },
    contact_two: { type: String },
    nationality: { type: String },
    blood_group: { type: String },
    gender: { type: String, enum: GENDER_TYPE },
    profile_image: { type: String },
    role: { type: ObjectId, ref: 'Role' }
});
let EMERGENCY_CONTACTS = mongoose.Schema({
    name: { type: String },
    contact: { type: String },
    relation: { type: String },
    cnic: { type: String },
    address: { type: String },
    attachment: { type: String }
});

let FAMILY_DETAILS = mongoose.Schema({
    martial_status: { type: Boolean, default: false },
    spouses: [{
        /* All Added */
        name: { type: String },
        cnic: { type: String },
        dob: { type: Date },
        nationality: { type: String },
        blood_group: { type: String },
        contact: { type: String },
        attachment: { type: String }
    }],
    children: [{
        name: { type: String },
        dob: { type: Date },
        nationality: { type: String },
        blood_group: { type: String },
        gender: { type: String, enum: GENDER_TYPE },
        attachment: { type: String }
    }],
    family_members: [{
        name: { type: String },
        cnic: { type: String },
        dob: { type: Date },
        profession: { type: String },
        //gender: { type: String, enum: GENDER_TYPE },
        nationality: { type: String },
        blood_group: { type: String },
        contact: { type: String },
        relation: { type: String },
        address: { type: String },
        attachment: { type: String }
    }]
});

let EDUCATION_DETAILS = mongoose.Schema({
    qualification: { type: String },
    from: { type: String },
    to: { type: String },
    institute: { type: String },
    details: { type: String },
    attachment: { type: String }
});

let PROFESSIONAL_EXPERINCE_DETAILS = mongoose.Schema({
    employer: { type: String },
    position: { type: String },
    from: { type: String },
    to: { type: String },
    last_salary: { type: String },
    reason_for_leaving: { type: String },
    details: { type: String },
    attachment: { type: String }
});

let EMPLOYEMENT_DETAILS = mongoose.Schema({
    confirmation_date: { type: Date },
    joining_date: { type: Date },
    quit_date: { type: Date },
    shift_timings: {
        time_in: {
            hour: {
                type: String
            },
            min: {
                type: String
            }
        },
        time_out: {
            hour: {
                type: String
            },
            min: {
                type: String
            }
        }
    },
    employee_type: { type: String, enum: EMPLOYEE_TYPE },
    employee_number: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    prefix: { type: String },
    contract_period: { type: Number },
    designation: { type: String },
    department: { type: ObjectId, ref: 'Department', default: undefined },
    unit: { type: ObjectId, ref: 'Unit', default: undefined },
    grade: { type: String },
    salary: { type: Number },
    benefits: {
        basic_pay: { type: Number },
        house_rent: { type: Number },
        medical: { type: Number },
        utilites_all: { type: Number }

    },
    payment_type: { type: String },
    account_details: {
        bank_name: { type: String },
        branch: { type: String },
        acc_number: { type: String },
        attachment: { type: String }
    }
});

let LOCATION_DETAILS = mongoose.Schema({
    address: { type: String },
    city: { type: String },
    country: { type: String }
});

let DOCUMENT_DETAILS = mongoose.Schema({
    doc_type: { type: ObjectId, ref: 'UserDocument' },
    attachment: { type: String },
    remarks: { type: String },
    filename: { type: String }
});
/* ALLOWANCE DETAILS */
let BENEFITS_DETAILS = mongoose.Schema({
    benefit_type: { type: String },
    benefit_value: { type: String },
    remarks: { type: String }
});
let ASSETS_DETAILS = mongoose.Schema({
    asset_type: { type: String },
    details: { type: String },
    asset_status: { type: String, enum: ASSET_STATUS },
    asset_id: { type: String },
    issue_date: { type: Date },
    valid_till: { type: Date },
    returned_on: { type: Date },
    asset_quantity: { type: Number },
    remarks: { type: String }
});
let FINANCIAL_PENALTIES = mongoose.Schema({
    offense_date: { type: Date },
    offense_act: { type: ObjectId, ref: 'Employee' },
    offense_reported_on: { type: Date },
    fine_amount: { type: String },
    remarks: { type: String }
});
let HIRING_DETAILS = mongoose.Schema({
    is_checked_documents: { type: Boolean, default: false },
    is_check_chairman: { type: Boolean, default: false },
    is_hired: { type: Boolean, default: false },
    reference_employee: { type: ObjectId, ref: 'Employee' },
    interviews: [
        {
            description: { type: String },
            scheduled_on: { type: Date },
            attended: { type: Boolean, default: false },
            result: { type: String },
        }
    ]
});

let LEAVE_DETAILS = mongoose.Schema({

    name: {
        type: String, enum: {
            values: LEAVE_TYPES,
            message: '100'
        }
    },
    total: { type: Number, default: 0 },
    used: { type: Number, default: 0 }

});

let FLAGS = {
    is_deleted: {
        type: Boolean,
        default: false
    },
    is_activated: {
        type: String, enum: EMPLOYEE_STATUS, default: 'Activated'
    },
    is_leaves_allowed: {
        type: Boolean,
        default: true
    }
};

let employeeSchema = mongoose.Schema({
    basic_details: BASIC_DETAILS,
    family_details: FAMILY_DETAILS,
    employment_details: EMPLOYEMENT_DETAILS,
    location_details: LOCATION_DETAILS,
    professional_experience_details: [PROFESSIONAL_EXPERINCE_DETAILS],
    emergency_contacts: [EMERGENCY_CONTACTS],
    education_details: [EDUCATION_DETAILS],
    document_details: [DOCUMENT_DETAILS],
    benefits_details: [BENEFITS_DETAILS],
    assets_details: [ASSETS_DETAILS],
    financial_penalties: [FINANCIAL_PENALTIES],
    timestamps: TIME_STAMPES,
    hiring_details: HIRING_DETAILS,
    leave_details: [LEAVE_DETAILS],
    transfer_logs: [{
        type: ObjectId,
        ref: 'TransferRequest'
    }],
    status: FLAGS
});
let Employee = module.exports = mongoose.model('Employee', employeeSchema);
function getQueryParams(queryParams) {

    let findParams = {};
    findParams = {
        'status.is_deleted': false,
        'status.is_activated': { $in: [EMPLOYEE_STATUS[1], EMPLOYEE_STATUS[2]] },
        'employment_details.employee_number': { $nin: SYSTEM_EMPLOYEES }

    };
    if (queryParams.search) {

        findParams['$or'] = [
            { 'basic_details.firstname': { $regex: queryParams.search, $options: 'i' } },
            { 'basic_details.lastname': { $regex: queryParams.search, $options: 'i' } },
            { 'basic_details.email': { $regex: queryParams.search, $options: 'i' } },
            { 'basic_details.cnic': { $regex: queryParams.search, $options: 'i' } },
            { 'basic_details.contact_one': { $regex: queryParams.search, $options: 'i' } },
            { 'basic_details.contact_two': { $regex: queryParams.search, $options: 'i' } },
            { 'location_details.address': { $regex: queryParams.search, $options: 'i' } },
            { 'location_details.city': { $regex: queryParams.search, $options: 'i' } },
            { 'location_details.country': { $regex: queryParams.search, $options: 'i' } },
            { 'employment_details.employee_number': { $regex: queryParams.search, $options: 'i' } },
        ];

    }
    if (queryParams.startdate && queryParams.enddate) {
        findParams['timestamps.created_at'] = { "$gte": queryParams.startdate + ' 00:00:00', "$lt": queryParams.enddate + ' 23:59:00' }
    }
    if (queryParams.status) {
        findParams['status.is_activated'] = queryParams.status
    }
    if (queryParams.designation) {
        findParams['employment_details.designation'] = queryParams.designation
    }
    if (queryParams.department) {
        findParams['employment_details.department'] = queryParams.department
    }

    if (queryParams.unit instanceof Array) {
        findParams['employment_details.unit'] = { $in: queryParams.unit }
    }
    if (queryParams.martial_status) {
        findParams['family_details.martial_status'] = queryParams.martial_status
    }
    if (queryParams.employee_type) {
        findParams['employment_details.employee_type'] = queryParams.employee_type
    }
    if (queryParams.gender) {
        findParams['basic_details.gender'] = queryParams.gender
    }
    if (queryParams.blood_group) {
        findParams['basic_details.blood_group'] = queryParams.blood_group
    }
    if (queryParams.joining_date != '' && queryParams.joining_date != undefined) {
        findParams['employment_details.joining_date'] = queryParams.joining_date
    }
    if (queryParams.salary_range_from && queryParams.salary_range_to) {
        findParams['employment_details.salary'] = { "$gte": queryParams.salary_range_from, "$lt": queryParams.salary_range_to }
    }
    if (queryParams.roleid) {
        findParams['basic_details.role'] = queryParams.roleid;
    }

    return findParams;
}

module.exports.addManyEmployees = function (employees) {

    return Employee.insertMany(employees);

};
module.exports.addEmployee = function (employee, callback) {
    Employee.create(employee, callback);
};
module.exports.updateEmployee = function (updateParam, employee, callback) {

    employee['timestamps.updated_at'] = new Date
    Employee.updateOne(updateParam, employee, callback);
}

module.exports.updateManyEmployee = function (updateParam, data) {

    data['timestamps.updated_at'] = new Date;
    return Employee.updateMany(updateParam, data, { multi: true });
}
module.exports.deleteEmployee = function (employeeid, callback) {

    let updateDeleteFlag = {
        'status.is_deleted': true
    };
    Employee.updateOne({ _id: employeeid }, updateDeleteFlag, callback);
}
module.exports.countEmployee = function (queryParams) {

    // return getCountOfRecordsV2(Employee, getQueryParams(queryParams));
    let params = getQueryParams(queryParams)
    return Employee.countDocuments()

}
module.exports.getSpecificEmployee = function (param, callback) {

    Employee.find(param, callback)
        .lean(true)
        .populate('employment_details.department')
        .populate('basic_details.role')
        .populate('document_details.doc_type')
        .populate({ path: 'transfer_logs', populate: [{ path:'transfer_details.transfer_to.unit' }, { path:'transfer_details.transfer_to.department' }, { path:'transfer_details.transfer_from.unit' }, { path:'transfer_details.transfer_from.department' }, { path:'transfer_for_employee' }, { path:'generated_by' } , { path:'replacement_employee' }] })
        .populate('employment_details.unit');
}

module.exports.getSpecificEmployeeV2 = function (param, select_fields = '') {

    return Employee.find(param)
        .lean(true)
        .select(select_fields)
        .populate('employment_details.department')
        .populate('basic_details.role')
        .populate('document_details.doc_type')
        .populate({ path: 'transfer_logs', populate: [{ path: 'basic_details.role' }] },)
        .populate('employment_details.unit');
}


module.exports.getEmployee = function (queryParams, select_fields = '') {

    let sortObj = {};

    if (queryParams.sort != '' && queryParams.sortby != '') {
        sortObj[queryParams.sort] = queryParams.sortby;
    }
    let populateArray = [
        'employment_details.department',
        'basic_details.role',
        'employment_details.unit'
    ];

    return searchQueryV2(Employee, queryParams.limit, queryParams.page, sortObj, getQueryParams(queryParams), populateArray, select_fields);
}