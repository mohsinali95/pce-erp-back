'use strict';
import { hash, genSalt } from "bcrypt";
import fs from 'fs';
import path from 'path';
import generatePassword from 'password-generator';
import { parseBody, generateResponse, getPublicEmployeeAssetsFilePath, createCurrentAttendanceMonthObj, removeFileFromAssets, calculateBenefitsOnSalary, calculateDurationBetweenDates } from '../utilites';
import { decryptValue } from '../utilites/encryption-module';
import Employee from '../models/employee';
import EmployeeAttendance from '../models/employeeattendance';
import EmployeeFingerprint from '../models/employeefingerprint';
import EmploymentDuration from '../models/employmentduration';
import Unit from '../models/unit';
import HireRequest from '../models/hirerequests';
import UserDocument from '../models/document';
import config from "../conf";
import { GENDER_TYPE, EMPLOYEE_TYPE, EMPLOYEE_STATUS, LEAVE_TYPES } from '../utilites/constants';
import * as _ from 'lodash';

export function addEmployee(req, res) {

    let employee = parseBody(req);
    let file = req.file;
    console.log(file);
    let emp_number = employee['employee_number'];

    employee = {
        basic_details: {
            "firstname": employee['firstname'],
            "lastname": employee['lastname'],
            "cnic": employee['cnic'],
            "email": employee['email'],
            "dob": employee['dob'],
            "contact_one": employee['contact_one'],
            "contact_two": employee['contact_two'],
            "gender": employee['gender'],
            "blood_group": employee['blood_group'],
            "nationality": employee['nationality'],
            "role": employee['role']
        },
        employment_details: {
            "employee_type": employee['employee_type'],
            /* "password": generatePassword(12, false), */
            "password": employee['employee_number'],
            "employee_number": employee['employee_number'],
            "department": employee['department'],
            "unit": employee['unit'],
            "confirmation_date": '',
            "joining_date": '',
            "prefix": '',
            "contract_period": '',
            "designation": '',
            "shift_timings":{
                "time_in":{
                    "hour": "",
                    "min": ""
                },
                "time_out":{
                    "hour": "",
                    "min": ""
                },
            },
            "grade": '',
            "salary": '',
            "payment_type": '',
            "account_details": {
                "bank_name": "",
                "acc_number": "",
                "branch": ""
            }
        },
        location_details: {
            "address": '',
            "city": '',
            "country": ''
        },
        family_details: {
            martial_status: false,
            spouses: [],
            children: [],
            family_members: []
        },
        leave_details: [],
        status: {
            'is_activated': EMPLOYEE_STATUS[2]
        }

    };

    for (let i = 0; i < LEAVE_TYPES.length; i++) {

        const tempObj = {
            name: LEAVE_TYPES[i],
            total: 0

        }
        employee['leave_details'][i] = tempObj;
    }


    if (typeof file == 'undefined') {
        employee['basic_details']['profile_image'] = '';
    }
    else {
        employee['basic_details']['profile_image'] = getPublicEmployeeAssetsFilePath(emp_number, file['filename']);
    }

    let plainPassword = employee['employment_details']['password'];

    Employee.getSpecificEmployee({ 'employment_details.employee_number': emp_number }, (err, data) => {
        if (data.length > 0) {
            generateResponse(false, "employee number already exist", null, res);
        }
        else if (GENDER_TYPE.indexOf(employee['basic_details']['gender']) > -1 == false) {
            generateResponse(false, "Unable to Create Employee, Please Select from given Array", GENDER_TYPE, res);
        }
        else {
            Employee.getSpecificEmployee({ 'basic_details.cnic': employee['basic_details']['cnic'] }, (err, data) => {
                if (data.length > 0) {
                    generateResponse(false, "cnic already exist", null, res);
                }
                else {
                    genSalt(parseInt(config.app['password_saltRounds'], 10)).then(salt => {
                        hash(employee['employment_details']['password'], salt).then((hash) => {
                            employee['employment_details']['password'] = hash;
                            Employee.addEmployee(employee, async function (err, employee) {

                                if (err) {
                                    console.log(err);
                                    generateResponse(false, "Unable to Create Employee", null, res);
                                }
                                let credentials = {
                                    employee_number: employee['employment_details']['employee_number'],
                                    password: plainPassword
                                }
                                let cre_string = JSON.stringify(credentials);
                                cre_string = `\n${cre_string}`;
                                fs.appendFileSync('./assets/json/user-credentials.txt', cre_string, "UTF-8", { 'flags': 'a+' });

                                let fingerPrintEmployee = {
                                    employee_number: emp_number,
                                    fingerprint_data: []
                                };

                                let employeeAttendanceObj = {
                                    employee_number: emp_number,
                                    attendance_details: [
                                        createCurrentAttendanceMonthObj()
                                    ]

                                }

                                console.log(fingerPrintEmployee);

                                await EmployeeFingerprint.addEmployeeFingerprint(fingerPrintEmployee);
                                await EmployeeAttendance.createEmployeeAttendance(employeeAttendanceObj);
                                generateResponse(true, "Successfully Created Employee", employee, res);
                            });
                        });
                    });
                }

            });
        }
    });
}
export function isCheckEmployeeExist(req, res) {

    let body = parseBody(req);

    Employee.getSpecificEmployee({ 'employment_details.employee_number': body['employee_number'] }, (err, data) => {

        if (err) {
            console.log(err);
            generateResponse(false, "Error, Please try later  or check employee number", null, res);
        }

        if (data.length > 0) {
            generateResponse(true, "Employee Exist", null, res);
        }
        else {
            generateResponse(false, "Employee Does Not Exist", null, res);
        }
    });

}
export async function updateEmployeeEmergencyContact(req, res) {

    let emergencyContactData = parseBody(req);
    let employee_number = emergencyContactData['employee_number'];
    let toupdateId = req.query['id'];
    let updateObj = {};
    let updateParam = {};

    let file = req.file;


    if (toupdateId != 'undefined') {
        console.log('Old');

        let employee = await Employee.getSpecificEmployeeV2({ 'employment_details.employee_number': employee_number });
        employee = employee[0];
        let details_old = employee['emergency_contacts'].filter((obj) => {
            return obj['_id'] == toupdateId;
        });

        details_old = details_old[0];

        if (typeof file != 'undefined') {

            if (details_old['attachment'] != '') {
                let attachement = details_old['attachment'].split('/');
                let filepath = `./assets/${attachement[1]}/${attachement[2]}/${attachement[3]}`;
                if (fs.existsSync(filepath)) {
                    fs.unlinkSync(filepath)
                }


            }

            updateObj = {
                "$set": {
                    "emergency_contacts.$.name": emergencyContactData['name'],
                    "emergency_contacts.$.contact": emergencyContactData['contact'],
                    "emergency_contacts.$.relation": emergencyContactData['relation'],
                    "emergency_contacts.$.cnic": emergencyContactData['cnic'],
                    "emergency_contacts.$.address": emergencyContactData['address'],
                    "emergency_contacts.$.attachment": getPublicEmployeeAssetsFilePath(employee_number, file['filename'])

                }
            };

        }
        else {

            updateObj = {
                "$set": {
                    "emergency_contacts.$.name": emergencyContactData['name'],
                    "emergency_contacts.$.contact": emergencyContactData['contact'],
                    "emergency_contacts.$.relation": emergencyContactData['relation'],
                    "emergency_contacts.$.cnic": emergencyContactData['cnic'],
                    "emergency_contacts.$.address": emergencyContactData['address'],
                }
            };

        }
        updateParam = { 'employment_details.employee_number': employee_number, 'emergency_contacts._id': toupdateId };

        console.log('Update Param', updateParam);

    }
    else {
        console.log('New');
        let new_emergency_contact = {};
        new_emergency_contact['name'] = emergencyContactData['name'];
        new_emergency_contact['contact'] = emergencyContactData['contact'];
        new_emergency_contact['relation'] = emergencyContactData['relation'];
        new_emergency_contact['cnic'] = emergencyContactData['cnic'];
        new_emergency_contact['address'] = emergencyContactData['address'];
        new_emergency_contact['attachment'] = typeof file != 'undefined' ? getPublicEmployeeAssetsFilePath(employee_number, file['filename']) : '';

        updateObj = {
            $push: {
                'emergency_contacts': new_emergency_contact
            }
        }

        updateParam = { 'employment_details.employee_number': employee_number };

        console.log('Update Param', updateParam);

    }


    console.log(updateObj);

    Employee.updateEmployee(updateParam, updateObj, (err, update) => {
        console.log(update);
        if (err) {
            generateResponse(false, 'Unable to update Employee', null, res);
        }
        generateResponse(true, 'New Emergency Contact Added', null, res);
    });



}
export function updateEmployeeAddress(req, res) {

    let location_details = parseBody(req);
    let employee_number = location_details['employee_number'];

    let updateObj = {
        location_details: {
            address: location_details['address'],
            city: location_details['city'],
            country: location_details['country']
        }
    }
    Employee.updateEmployee({ 'employment_details.employee_number': employee_number }, updateObj, (err, update) => {
        console.log(update);

        if (err) {
            generateResponse(false, 'Unable to update Employee', null, res);
        }
        generateResponse(true, 'Address details Updated', null, res);
    });
}
export async function updateEmployeeBasicDetails(req, res) {

    let basic_details = parseBody(req);
    let employee_number = basic_details['employee_number'];

    let updateObj = {

        $set: {

            'basic_details': basic_details,
            'status.is_activated': basic_details['is_activated']
        }

    };

    console.log(updateObj);


    Employee.updateEmployee({ 'employment_details.employee_number': employee_number }, updateObj, (err, update) => {
        console.log(update);

        if (err) {
            console.log(err);
            generateResponse(false, 'Unable to update Employee', null, res);
        }
        else {
            generateResponse(true, 'Basic Details details Updated', null, res);
        }

    });
}
export function updateProfileImage(req, res) {

    let image_details = parseBody(req);
    let file = req.file;
    let updateObj = {};
    let employee_number = image_details['employee_number'];

    if (typeof file == 'undefined') {
        updateObj['basic_details.profile_image'] = '';
    }
    else {
        updateObj['basic_details.profile_image'] = getPublicEmployeeAssetsFilePath(employee_number, file['filename']);
    }

    Employee.updateEmployee({ 'employment_details.employee_number': employee_number }, updateObj, (err, update) => {
        console.log(update);

        if (err) {
            generateResponse(false, 'Unable to update Employee', null, res);
        }
        generateResponse(true, 'Profile Picture Updated', null, res);
    });
}
export async function updateProfessionalExp(req, res) {

    let exp_details = parseBody(req);
    let employee_number = exp_details['employee_number'];
    let toupdateId = req.query['id'];
    let updateObj = {};
    let updateParam = {};
    let file = req.file;

    if (toupdateId != 'undefined') {
        console.log('Old');
        let employee = await Employee.getSpecificEmployeeV2({ 'employment_details.employee_number': employee_number });
        employee = employee[0];
        let details_old = employee['professional_experience_details'].filter((obj) => {
            return obj['_id'] == toupdateId;
        });

        details_old = details_old[0];

        if (typeof file != 'undefined') {

            if (details_old['attachment'] != '') {
                let attachement = details_old['attachment'].split('/');
                let filepath = `./assets/${attachement[1]}/${attachement[2]}/${attachement[3]}`;
                if (fs.existsSync(filepath)) {
                    fs.unlinkSync(filepath)
                }
                /* fs.unlinkSync(`./assets/${attachement[1]}/${attachement[2]}/${attachement[3]}`) */
            }

            updateObj = {
                "$set": {
                    "professional_experience_details.$.employer": exp_details['employer'],
                    "professional_experience_details.$.position": exp_details['position'],
                    "professional_experience_details.$.last_salary": exp_details['last_salary'],
                    "professional_experience_details.$.reason_for_leaving": exp_details['reason_for_leaving'],
                    "professional_experience_details.$.details": exp_details['details'],
                    "professional_experience_details.$.from": exp_details['from'],
                    "professional_experience_details.$.to": exp_details['to'],
                    "professional_experience_details.$.attachment": getPublicEmployeeAssetsFilePath(employee_number, file['filename'])
                }
            };

        }
        else {

            updateObj = {
                "$set": {
                    "professional_experience_details.$.employer": exp_details['employer'],
                    "professional_experience_details.$.position": exp_details['position'],
                    "professional_experience_details.$.last_salary": exp_details['last_salary'],
                    "professional_experience_details.$.reason_for_leaving": exp_details['reason_for_leaving'],
                    "professional_experience_details.$.details": exp_details['details'],
                    "professional_experience_details.$.from": exp_details['from'],
                    "professional_experience_details.$.to": exp_details['to'],

                }
            };

        }
        updateParam = { 'employment_details.employee_number': employee_number, 'professional_experience_details._id': toupdateId };

        console.log('Update Param', updateParam);
    }
    else {

        console.log('New');

        let new_expirence = {};
        new_expirence['employer'] = exp_details['employer'];
        new_expirence['position'] = exp_details['position'];
        new_expirence['last_salary'] = exp_details['last_salary'];
        new_expirence['reason_for_leaving'] = exp_details['reason_for_leaving'];
        new_expirence['details'] = exp_details['details'];
        new_expirence['from'] = exp_details['from'];
        new_expirence['to'] = exp_details['to'];
        new_expirence['attachment'] = typeof file != 'undefined' ? getPublicEmployeeAssetsFilePath(employee_number, file['filename']) : '';

        updateObj = {
            $push: {
                'professional_experience_details': new_expirence
            }
        }

        updateParam = { 'employment_details.employee_number': employee_number };

        console.log('Update Param', updateParam);
    }

    Employee.updateEmployee(updateParam, updateObj, (err, update) => {
        console.log(update);
        if (err) {
            generateResponse(false, 'Unable to update Employee', null, res);
        }
        generateResponse(true, 'New Professional Experience Added', null, res);
    });

}
export async function updateEmploymentDetails(req, res) {

    let employment_details = parseBody(req);
    let employee_number = employment_details['employee_number'];
    console.log(JSON.parse(employment_details['shift_timings']));
    let file = req.file;

    let updateObj = {};

    updateObj['employment_details.employee_type'] = employment_details['employee_type'];
    updateObj['employment_details.confirmation_date'] = employment_details['confirmation_date'];
    updateObj['employment_details.quit_date'] = employment_details['quit_date'];
    updateObj['employment_details.joining_date'] = employment_details['joining_date'];
    updateObj['employment_details.prefix'] = employment_details['prefix'];
    updateObj['employment_details.contract_period'] = employment_details['contract_period'] == 'null' ? 0 : employment_details['contract_period'];
    updateObj['employment_details.grade'] = employment_details['grade'];
    updateObj['employment_details.salary'] = employment_details['salary'];
    updateObj['employment_details.benefits'] = calculateBenefitsOnSalary(employment_details['salary']);
    updateObj['employment_details.payment_type'] = employment_details['payment_type'];
    updateObj['employment_details.designation'] = employment_details['designation'];
    updateObj['employment_details.account_details.bank_name'] = employment_details['bank_name'];
    updateObj['employment_details.account_details.branch'] = employment_details['branch'];
    updateObj['employment_details.account_details.acc_number'] = employment_details['acc_number'];
    updateObj['employment_details.account_details.attachment'] = typeof file != 'undefined' ? getPublicEmployeeAssetsFilePath(employee_number, file['filename']) : '';
    updateObj['employment_details.shift_timings'] = JSON.parse(employment_details['shift_timings']);


    console.log(employment_details['quit_date']);

    if (employment_details['quit_date'] !== '') {

        updateObj['status.is_activated'] = EMPLOYEE_STATUS[2];
        updateObj['employment_details.quit_date'] = '';
        updateObj['employment_details.joining_date'] = '';


        let employee_details = await Employee.getSpecificEmployeeV2({ 'employment_details.employee_number': employee_number }, '_id')
        employee_details = employee_details[0];
        let employmentCount = await EmploymentDuration.countEmploymentDuration({ 'employee': employee_details['_id'] })
        console.log(employmentCount);


        let durationObj = {
            employee: employee_details['_id'],
            employment_count: employmentCount + 1,
            activation_date: employment_details['joining_date'],
            deactivation_date: employment_details['quit_date'],
            duration: calculateDurationBetweenDates(new Date(employment_details['joining_date']), employment_details['quit_date'])
        }


        let employment = await EmploymentDuration.addEmploymentDuration(durationObj);
        console.log(employment);
        Employee.updateEmployee({ 'employment_details.employee_number': employee_number }, updateObj, (err, update) => {
            console.log(update);
            if (err) {
                generateResponse(false, 'Unable to update Employee', err.message, res);
            }
            else {

                generateResponse(true, 'Employment Details Updated', null, res);
            }

        });

    }
    else {
        console.log('Else');

        Employee.updateEmployee({ 'employment_details.employee_number': employee_number }, updateObj, (err, update) => {
            console.log(update);
            if (err) {
                generateResponse(false, 'Unable to update Employee', err.message, res);
            }
            else {

                generateResponse(true, 'Employment Details Updated', null, res);
            }

        });

    }



}
export async function updateEducationDetails(req, res) {

    let edu_details = parseBody(req);
    let employee_number = edu_details['employee_number'];
    let toupdateId = req.query['id'];
    let updateObj = {};
    let updateParam = {};
    let file = req.file;
    //console.log(file);


    if (toupdateId != 'undefined') {

        console.log('Old');
        let employee = await Employee.getSpecificEmployeeV2({ 'employment_details.employee_number': employee_number });
        employee = employee[0];
        let details_old = employee['education_details'].filter((obj) => {
            return obj['_id'] == toupdateId;
        });

        details_old = details_old[0];

        console.log(details_old);

        if (typeof file != 'undefined') {
            if (details_old['attachment'] != '') {
                let attachement = details_old['attachment'].split('/');
                let filepath = `./assets/${attachement[1]}/${attachement[2]}/${attachement[3]}`;
                if (fs.existsSync(filepath)) {
                    fs.unlinkSync(filepath)
                }
                /*  fs.unlinkSync(`./assets/${attachement[1]}/${attachement[2]}/${attachement[3]}`) */
            }
            updateObj = {
                "$set": {
                    "education_details.$.qualification": edu_details['qualification'],
                    "education_details.$.from": edu_details['from'],
                    "education_details.$.to": edu_details['to'],
                    "education_details.$.institute": edu_details['institute'],
                    "education_details.$.details": edu_details['details'],
                    "education_details.$.attachment": getPublicEmployeeAssetsFilePath(employee_number, file['filename'])
                }
            };
        }
        else {
            updateObj = {
                "$set": {
                    "education_details.$.qualification": edu_details['qualification'],
                    "education_details.$.from": edu_details['from'],
                    "education_details.$.to": edu_details['to'],
                    "education_details.$.institute": edu_details['institute'],
                    "education_details.$.details": edu_details['details']
                }
            };


        }

        updateParam = { 'employment_details.employee_number': employee_number, 'education_details._id': toupdateId };
        console.log('Update Param', updateParam);

    }
    else {
        console.log('New');

        let new_education = {};
        new_education['qualification'] = edu_details['qualification'];
        new_education['from'] = edu_details['from'];
        new_education['to'] = edu_details['to'];
        new_education['institute'] = edu_details['institute'];
        new_education['details'] = edu_details['details'];
        new_education['attachment'] = typeof file != 'undefined' ? getPublicEmployeeAssetsFilePath(employee_number, file['filename']) : '';

        console.log(new_education);
        updateObj = {
            $push: {
                'education_details': new_education
            }
        };
        updateParam = { 'employment_details.employee_number': employee_number };
        console.log('Update Param', updateParam);
    }

    Employee.updateEmployee(updateParam, updateObj, (err, update) => {
        console.log(update);

        if (err) {
            console.log(err.message);
            generateResponse(false, 'Unable to update Employee', null, res);
        }
        generateResponse(true, 'New Education Added', null, res);
    });




}
export async function updateDocumentDetails(req, res) {
    let doc_details = parseBody(req);

    let employee_number = doc_details['employee_number'];
    let toupdateId = req.query['id'];
    let updateObj = {};
    let updateParam = {};
    let file = req.file;

    if (toupdateId != 'undefined') {
        console.log('Old');
        let employee = await Employee.getSpecificEmployeeV2({ 'employment_details.employee_number': employee_number });
        employee = employee[0];
        let details_old = employee['document_details'].filter((obj) => {
            return obj['_id'] == toupdateId;
        });

        details_old = details_old[0];

        if (details_old['attachment'] != '') {
            let attachement = details_old['attachment'].split('/');
            let filepath = `./assets/${attachement[1]}/${attachement[2]}/${attachement[3]}`;
            if (fs.existsSync(filepath)) {
                fs.unlinkSync(filepath)
            }
        }
        let fileName = file['filename'].split('.')
        updateObj = {
            "$set": {
                "document_details.$.doc_type": doc_details['doc_type'],
                "document_details.$.remarks": doc_details['remarks'],
                "document_details.$.filename": fileName[0],
                "document_details.$.attachment": getPublicEmployeeAssetsFilePath(employee_number, file['filename'])
            }
        };
        updateParam = { 'employment_details.employee_number': employee_number, 'document_details._id': toupdateId };
        console.log('Update Param', updateParam);

    }
    else {
        console.log('New');
        let newDocument = {};
        newDocument['doc_type'] = doc_details['doc_type'];
        newDocument['remarks'] = doc_details['remarks'];
        newDocument['attachment'] = getPublicEmployeeAssetsFilePath(employee_number, file['filename']);
        let fileName = file['filename'].split('.')
        newDocument['filename'] = fileName[0]

        updateObj = {
            $push: {
                'document_details': newDocument
            }
        };

        updateParam = { 'employment_details.employee_number': employee_number };

    }

    Employee.updateEmployee(updateParam, updateObj, (err, update) => {
        console.log(update);
        if (err) {
            generateResponse(false, 'Unable to update Employee', null, res);
        }

        Employee.getSpecificEmployee({ 'employment_details.employee_number': employee_number }, (err, employee) => {
            if (err) {
                generateResponse(false, 'Unable to Fetched Speicific Employee', null, res);
            }
            UserDocument.countUserDocuments({ document_required: true }, (err, requiredCount) => {

                let document_ids = _.map(employee[0]['document_details'], (obj) => {

                    return obj['doc_type'];


                });

                console.log('2', document_ids);


                let required_documents_employees = _.filter(document_ids, (obj) => {

                    return obj['document_required'] == true;

                });

                console.log('1st', required_documents_employees);


                let unique_required_documents = new Set(required_documents_employees);


                console.log('2nd', unique_required_documents.size);


                if (unique_required_documents.size == requiredCount) {

                    let updateStatus = {};
                    updateStatus['status.is_activated'] = EMPLOYEE_STATUS[1];

                    //generateResponse(true, 'All the requirements are completed and Profile Activated', null, res);
                    Employee.updateEmployee({ 'employment_details.employee_number': employee_number }, updateStatus, (err, update) => {
                        console.log(update);
                        if (err) {
                            generateResponse(false, 'Unable to update Employee', null, res);
                        }
                        generateResponse(true, 'All the requirements are completed and Profile Activated', null, res);
                    });
                }
                else {
                    generateResponse(true, 'Documents Update Successfully', null, res);
                }
            });
        });
    });
}
export async function updateMartialDetails(req, res) {

    let martial_details = parseBody(req);
    let employee_number = martial_details['employee_number'];
    let file = req.file;
    let updateObj = {};
    let updateParam = {};
    let toupdateId = req.query['id'];
    if (toupdateId != 'undefined') {
        console.log('Old');
        let employee = await Employee.getSpecificEmployeeV2({ 'employment_details.employee_number': employee_number });
        employee = employee[0];

        let details_old = employee['family_details']['spouses'].filter((obj) => {
            return obj['_id'] == toupdateId;
        });

        details_old = details_old[0];

        if (typeof file != 'undefined') {

            if (details_old['attachment'] != '') {
                let attachement = details_old['attachment'].split('/');
                /*  fs.unlinkSync(`./assets/${attachement[1]}/${attachement[2]}/${attachement[3]}`) */
                let filepath = `./assets/${attachement[1]}/${attachement[2]}/${attachement[3]}`;
                if (fs.existsSync(filepath)) {
                    fs.unlinkSync(filepath)
                }
            }

            updateObj = {
                "$set": {
                    "family_details.spouses.$.name": martial_details['name'],
                    "family_details.spouses.$.cnic": martial_details['cnic'],
                    "family_details.spouses.$.dob": martial_details['dob'],
                    "family_details.spouses.$.nationality": martial_details['nationality'],
                    "family_details.spouses.$.blood_group": martial_details['blood_group'],
                    "family_details.spouses.$.contact": martial_details['contact'],
                    "family_details.spouses.$.attachment": getPublicEmployeeAssetsFilePath(employee_number, file['filename'])

                }
            };

        }
        else {

            updateObj = {
                "$set": {
                    "family_details.spouses.$.name": martial_details['name'],
                    "family_details.spouses.$.cnic": martial_details['cnic'],
                    "family_details.spouses.$.dob": martial_details['dob'],
                    "family_details.spouses.$.nationality": martial_details['nationality'],
                    "family_details.spouses.$.blood_group": martial_details['blood_group'],
                    "family_details.spouses.$.contact": martial_details['contact'],

                }
            };



        }
        updateParam = { 'employment_details.employee_number': employee_number, 'family_details.spouses._id': toupdateId };

        console.log('Update Param', updateParam);



    }
    else {
        console.log('New');

        updateObj = {
            $push: {
                'family_details.spouses': {
                    name: martial_details['name'],
                    cnic: martial_details['cnic'],
                    dob: martial_details['dob'],
                    nationality: martial_details['nationality'],
                    blood_group: martial_details['blood_group'],
                    contact: martial_details['contact'],
                    attachment: typeof file != 'undefined' ? getPublicEmployeeAssetsFilePath(employee_number, file['filename']) : '',
                }
            },
            'family_details.martial_status': martial_details['martial_status']
        };

        updateParam = { 'employment_details.employee_number': employee_number };
        console.log('Update Param', updateParam);
    }

    Employee.updateEmployee(updateParam, updateObj, (err, update) => {
        console.log(update);
        if (err) {
            generateResponse(false, 'Unable to update Employee', null, res);
        }
        generateResponse(true, 'Martial Details Updated', null, res);
    });

}
export async function updateRelationalDetails(req, res) {

    let relationDetails = parseBody(req);
    console.log('R', relationDetails);
    let employee_number = relationDetails['employee_number'];
    let toupdateId = req.query['id'];
    let updateObj = {};
    let updateParam = {};
    let file = req.file;
    if (toupdateId != 'undefined') {
        console.log('Old');
        let employee = await Employee.getSpecificEmployeeV2({ 'employment_details.employee_number': employee_number });
        employee = employee[0];
        //console.log('FM', employee['family_details']['family_members']);
        let details_old = employee['family_details']['family_members'].filter((obj) => {
            return obj['_id'] == toupdateId;
        });

        details_old = details_old[0];

        if (typeof file != 'undefined') {

            if (details_old['attachment'] != '') {
                let attachement = details_old['attachment'].split('/');
                let filepath = `./assets/${attachement[1]}/${attachement[2]}/${attachement[3]}`;
                if (fs.existsSync(filepath)) {
                    fs.unlinkSync(filepath)
                }
                /* fs.unlinkSync(`./assets/${attachement[1]}/${attachement[2]}/${attachement[3]}`) */
            }

            updateObj = {
                "$set": {
                    "family_details.family_members.$.name": relationDetails['name'],
                    "family_details.family_members.$.cnic": relationDetails['cnic'],
                    "family_details.family_members.$.dob": relationDetails['dob'],
                    "family_details.family_members.$.nationality": relationDetails['nationality'],
                    "family_details.family_members.$.profession": relationDetails['profession'],
                    "family_details.family_members.$.relation": relationDetails['relation'],
                    "family_details.family_members.$.address": relationDetails['address'],
                    "family_details.family_members.$.blood_group": relationDetails['blood_group'],
                    //"family_details.family_members.$.gender": relationDetails['gender'],
                    "family_details.family_members.$.contact": relationDetails['contact'],
                    "family_details.family_members.$.attachment": getPublicEmployeeAssetsFilePath(employee_number, file['filename'])

                }
            };

        }
        else {

            updateObj = {
                "$set": {
                    "family_details.family_members.$.name": relationDetails['name'],
                    "family_details.family_members.$.cnic": relationDetails['cnic'],
                    "family_details.family_members.$.dob": relationDetails['dob'],
                    "family_details.family_members.$.nationality": relationDetails['nationality'],
                    "family_details.family_members.$.profession": relationDetails['profession'],
                    "family_details.family_members.$.relation": relationDetails['relation'],
                    "family_details.family_members.$.address": relationDetails['address'],
                    "family_details.family_members.$.blood_group": relationDetails['blood_group'],
                    //"family_details.family_members.$.gender": relationDetails['gender'],
                    "family_details.family_members.$.contact": relationDetails['contact'],

                }
            };



        }
        updateParam = { 'employment_details.employee_number': employee_number, 'family_details.family_members._id': toupdateId };

        console.log('Update Param', updateParam);



    }
    else {
        console.log('New');

        updateObj = {
            $push: {
                'family_details.family_members': {
                    name: relationDetails['name'],
                    cnic: relationDetails['cnic'],
                    dob: relationDetails['dob'],
                    nationality: relationDetails['nationality'],
                    profession: relationDetails['profession'],
                    relation: relationDetails['relation'],
                    address: relationDetails['address'],
                    blood_group: relationDetails['blood_group'],
                    /* gender: relationDetails['gender'], */
                    contact: relationDetails['contact'],
                    attachment: typeof file != 'undefined' ? getPublicEmployeeAssetsFilePath(employee_number, file['filename']) : '',
                }
            }
        };

        updateParam = { 'employment_details.employee_number': employee_number };
        console.log('Update Param', updateParam);
    }

    Employee.updateEmployee(updateParam, updateObj, (err, update) => {
        console.log(update);
        if (err) {
            generateResponse(false, 'Unable to update Employee', null, res);
        }
        generateResponse(true, 'Family Members Details Updated', null, res);
    });




}
export function updateChildrenDetails(req, res) {

    /* employee_number = decryptValue(req.query['employee_number']]); */
    let childrenDetails = parseBody(req);
    let employee_number = childrenDetails['employee_number'];
    let file = req.file;
    console.log(file);
    let updateObj = {};
    updateObj = {
        $push: {
            'family_details.children': {
                name: childrenDetails['name'],
                dob: childrenDetails['dob'],
                nationality: childrenDetails['nationality'],
                blood_group: childrenDetails['blood_group'],
                gender: childrenDetails['gender'],
                attachment: getPublicEmployeeAssetsFilePath(employee_number, file['filename']),
            }
        }
    }

    Employee.updateEmployee({ 'employment_details.employee_number': employee_number }, updateObj, (err, update) => {
        console.log(update);
        if (err) {
            generateResponse(false, 'Unable to update Employee', null, res);
        }
        generateResponse(true, 'Children Details Updated', null, res);
    });

}
export function updateBenefitDetails(req, res) {
    let benefit_details = parseBody(req);
    let employee_number = benefit_details['employee_number'];
    let toupdateId = req.query['id'];
    let updateObj = {};
    let updateParam = {};

    if (toupdateId != 'undefined') {
        console.log('Old');
        updateObj = {
            "$set": {
                "benefits_details.$.benefit_type": benefit_details['benefit_type'],
                "benefits_details.$.remarks": benefit_details['remarks'],
                "benefits_details.$.benefit_value": benefit_details['benefit_value']
            }
        };

        updateParam = { 'employment_details.employee_number': employee_number, 'benefits_details._id': toupdateId };
    }
    else {

        console.log('New');
        let newbenefit = {};
        newbenefit['benefit_type'] = benefit_details['benefit_type'];
        newbenefit['remarks'] = benefit_details['remarks'];
        newbenefit['benefit_value'] = benefit_details['benefit_value'];

        updateObj = {
            $push: {
                'benefits_details': newbenefit
            }
        }

        updateParam = { 'employment_details.employee_number': employee_number };
        console.log('Update Param', updateParam);
    }

    Employee.updateEmployee(updateParam, updateObj, (err, update) => {
        console.log(update);
        if (err) {
            generateResponse(false, 'Unable to update Employee', null, res);
        }
        generateResponse(true, 'New Benefit Details Added', null, res);
    });
}
export function updateEmployeeStatus(req, res) {

    let body = parseBody(req);
    let employee_number = body['employee_number'];

    let updateObj = {};
    updateObj['status.is_activated'] = body['is_activated'];
    updateObj['hiring_details.is_check_chairman'] = body['is_check_chairman'];
    updateObj['hiring_details.is_hired'] = body['is_hired'];
    updateObj['hiring_details.is_checked_documents'] = body['is_checked_documents'];
    Employee.updateEmployee({ 'employment_details.employee_number': employee_number }, updateObj, (err, update) => {
        console.log(update);
        if (err) {
            generateResponse(false, 'Unable to update Employee', null, res);
        }
        generateResponse(true, 'Employee Status Updated', null, res);
    });

}
/* Get Employees */
export async function getEmployee(req, res) {

    let queryParams = {
        search: req.query.search || '',
        status: req.query.status || '',
        page: req.query.page || 1,
        limit: req.query.limit || 10,
        sort: req.query.sort || 'basic_details.firstname',
        sortby: req.query.sortby || 1,
        startdate: req.query.startdate,
        enddate: req.query.enddate,
        /* Custom */
        department: req.query.department || null,
        unit: req.query.unit || null,
        martial_status: req.query.martial_status,
        designation: req.query.designation,
        employee_type: req.query.employee_type,
        gender: req.query.gender,
        blood_group: req.query.blood_group,
        joining_date: req.query.joining_date || '',
        salary_range_from: req.query.salary_range_from || '',
        salary_range_to: req.query.salary_range_to || ''
    };

    let date = new Date();
    queryParams.startdate = queryParams.startdate || '2018-1-01';
    queryParams.enddate = queryParams.enddate || date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate();

    try {
        if (req.query.fetch_by == 'all') {

            console.log('All');
            queryParams.unit = null;
            queryParams.department = null;

            let employees = await Employee.getEmployee(queryParams);
            let count = await Employee.countEmployee(queryParams);

            if (count != 0) {
                let data = {
                    employees: employees,
                    current: queryParams.page,
                    pages: Math.ceil(count / queryParams.limit),
                    totalrecords: count
                }
                generateResponse(true, "Fetch Employees", data, res);
            }
            else {

                let data = {
                    employees: employees,
                    current: queryParams.page,
                    pages: queryParams.page,
                    totalrecords: count
                }
                generateResponse(true, "Fetch Employees", data, res);
            }

        }
        else if (req.query.fetch_by == 'unit') {

            console.log('By Unit');
            queryParams.department = null;
            console.log('Unit ID', queryParams['unit']);
            let units = await Unit.getUnitV2({ ancestors: queryParams['unit'] }, [], '_id name');
            let unitIds = [];
            unitIds.push(queryParams['unit']);
            _.map(units, (item) => {
                unitIds.push(item['_id']);
            });

            queryParams['unit'] = unitIds;
            let employees = await Employee.getEmployee(queryParams);
            let count = await Employee.countEmployee(queryParams);

            if (count != 0) {
                let data = {
                    employees: employees,
                    current: queryParams.page,
                    pages: Math.ceil(count / queryParams.limit),
                    totalrecords: count
                }
                generateResponse(true, "Fetch Employees", data, res);
            }
            else {

                let data = {
                    employees: employees,
                    current: queryParams.page,
                    pages: queryParams.page,
                    totalrecords: count
                }
                generateResponse(true, "Fetch Employees", data, res);
            }
        }
        else if (req.query.fetch_by == 'department') {

            console.log('By Department');
            queryParams.unit = [queryParams['unit']];
            let employees = await Employee.getEmployee(queryParams);
            let count = await Employee.countEmployee(queryParams);

            if (count != 0) {
                let data = {
                    employees: employees,
                    current: queryParams.page,
                    pages: Math.ceil(count / queryParams.limit),
                    totalrecords: count
                }
                generateResponse(true, "Fetch Employees", data, res);
            }
            else {

                let data = {
                    employees: employees,
                    current: queryParams.page,
                    pages: queryParams.page,
                    totalrecords: count
                }
                generateResponse(true, "Fetch Employees", data, res);
            }
        }
    }
    catch (e) {
        console.log(e);
        generateResponse(false, "Unable to Fetch Employees", null, res);
    }
}
export function deleteEmployee(req, res) {

    /*  let empid = req.query.id; */
    let key = req.query.key;
    let object_id = req.query.object_id
    let empid = decryptValue(req.query.id);

    console.log(key);

    if (key == 'employee') {


        Employee.deleteEmployee(empid, (err, update) => {
            console.log(update);
            if (err) {
                generateResponse(false, 'Unable to delete Employee', null, res);
            }
            generateResponse(true, 'Employee Deleted Successfully', null, res);

        });
    }
    else {

        let updateObj = {};

        updateObj[key] = { _id: object_id };

        let updateParam = { $pull: updateObj }

        //console.log(updateParam);


        Employee.updateEmployee({ 'employment_details.employee_number': empid }, updateParam, (err, update) => {
            console.log(update);
            if (err) {
                console.log(err);
                generateResponse(false, 'Unable to update Employee', null, res);
            }
            else {
                generateResponse(true, 'Employee Object Updated', null, res);
            }
        });
    }
}
export async function getSpecificEmployee(req, res) {
    let emp_number = decryptValue(req.params.id);

    Employee.getSpecificEmployee({ 'employment_details.employee_number': emp_number }, async (err, employee) => {
        if (err) {
            generateResponse(false, 'Unable to Fetched Speicific Employee', null, res);
        }

        let employmentLogs = await EmploymentDuration.getEmploymentDuration({'employee' : employee[0]['_id']});
        UserDocument.countUserDocuments({ document_required: true }, (err, requiredDocuments) => {

            let inserted_requried_documents = [];
            let insertedDocIds = [];
            let promise = new Promise((resolve, reject) => {

                employee[0]['document_details'].forEach(element => {

                    if (element['doc_type']['document_required'] && !insertedDocIds.includes(element['doc_type']['_id'])) {
                        inserted_requried_documents.push(element);
                        insertedDocIds.push(element['doc_type']['_id']);
                    }
                });
                resolve();
            });
            promise.then(() => {

                employee[0]['required_documents_size'] = inserted_requried_documents.length;
                employee[0]['required_documents'] = requiredDocuments;
                employee[0]['employment_logs'] = employmentLogs;


                console.log('Docs', employee[0]['required_documents']);
                generateResponse(true, 'Fetched Speicific Employee', employee, res);
            });

        });

    });
}

export async function addJobCandidates(req, res) {

    let body = parseBody(req);

    let file = req.file;
    console.log(file);

    let employee_number = body['employee_number'];
    let hiring_request_id = body['request_id'];

    let candidate = {
        basic_details: {
            "firstname": body['firstname'],
            "lastname": body['lastname'],
            "cnic": body['cnic'],
            "email": body['email'],
            "dob": body['dob'],
            "contact_one": body['contact_one'],
            "contact_two": body['contact_two'],
            "gender": body['gender'],
            "blood_group": body['blood_group'],
            "nationality": '',
            "role": null
        },
        employment_details: {
            "employee_type": EMPLOYEE_TYPE[4],
            "password": /* generatePassword(12, false) */ body['employee_number'],
            "employee_number": body['employee_number'],
            "department": body['department'],
            "unit": body['unit'],
            "confirmation_date": '',
            "joining_date": '',
            "prefix": '',
            "contract_period": '',
            "designation": '',
            "grade": '',
            "salary": '',
            "payment_type": '',
            "account_details": {
                "bank_name": "",
                "acc_number": "",
                "branch": ""
            }
        },
        location_details: {
            "address": '',
            "city": '',
            "country": ''
        },
        family_details: {
            martial_status: false,
            spouses: [],
            children: [],
            family_members: []
        },
        hiring_details: {
            "reference_employee": body['reference_employee'] == 'null' ? null : body['reference_employee'],
            "is_checked_documents": body['is_checked_documents'],
            "is_hired": false,
            "is_check_chairman": body['is_check_chairman']
        },
        status: {
            'is_activated': 'Pending'
        }
    };
    if (typeof file == 'undefined') {
        candidate['basic_details']['profile_image'] = '';
    }
    else {
        candidate['basic_details']['profile_image'] = getPublicEmployeeAssetsFilePath(employee_number, file['filename']);
    }

    let plainPassword = candidate['employment_details']['password'];

    let promise = new Promise(async (resolve, reject) => {

        console.log('In Promise');
        Employee.getSpecificEmployee({ 'employment_details.employee_number': employee_number }, (err, data) => {
            if (data.length > 0) {
                generateResponse(false, "employee number already exist", null, res);
            }
            else if (GENDER_TYPE.indexOf(candidate['basic_details']['gender']) > -1 == false) {
                generateResponse(false, "Unable to Create Employee, Please Select from given Array", GENDER_TYPE, res);
            }
            else {
                Employee.getSpecificEmployee({ 'basic_details.cnic': candidate['basic_details']['cnic'] }, (err, data) => {
                    if (data.length > 0) {
                        generateResponse(false, "cnic already exist", null, res);
                    }
                    else {
                        genSalt(parseInt(config.app['password_saltRounds'], 10)).then(salt => {
                            hash(candidate['employment_details']['password'], salt).then((hash) => {
                                candidate['employment_details']['password'] = hash;
                                Employee.addEmployee(candidate, async function (err, employee) {

                                    if (err) {
                                        console.log(err);
                                        generateResponse(false, "Unable to Create Employee", null, res);
                                    }
                                    let credentials = {
                                        employee_number: candidate['employment_details']['employee_number'],
                                        password: plainPassword
                                    }
                                    let cre_string = JSON.stringify(credentials);
                                    cre_string = `\n${cre_string}`;
                                    fs.appendFileSync('./assets/json/user-credentials.txt', cre_string, "UTF-8", { 'flags': 'a+' });

                                    let fingerPrintEmployee = {
                                        employee_number: employee_number,
                                        fingerprint_data: []
                                    };

                                    let employeeAttendanceObj = {
                                        employee_number: employee_number,
                                        attendance_details: [
                                            createCurrentAttendanceMonthObj()
                                        ]

                                    }

                                    console.log(fingerPrintEmployee);

                                    await EmployeeFingerprint.addEmployeeFingerprint(fingerPrintEmployee);
                                    await EmployeeAttendance.createEmployeeAttendance(employeeAttendanceObj);


                                    resolve(employee);

                                });
                            });
                        });
                    }
                });
            }
        });
    });
    promise.then((candidate) => {

        let updateCandidate = {
            $push: {
                'candidates': candidate['_id']
            }
        };
        HireRequest.updateHiringRequest({ '_id': hiring_request_id }, updateCandidate, (err, updataData) => {
            if (err) {
                console.log(err);
                generateResponse(false, "Unable to Add Candidate", null, res);
            }
            generateResponse(true, "Successfully Created Candidate and Added in Hiring Requests", updataData, res);
        });
    });
}
export function updateHiringInterviewDetails(req, res) {

    let body = parseBody(req);
    let add_interview = {};
    let employee_number = body['employee_number'];
    add_interview['description'] = body['description'];
    add_interview['scheduled_on'] = body['scheduled_on'];
    add_interview['attended'] = body['attended'] || false;
    add_interview['result'] = body['result'];

    let updateObj = {
        $push: {
            'hiring_details.interviews': add_interview
        }
    }

    Employee.updateEmployee({ 'employment_details.employee_number': employee_number }, updateObj, (err, update) => {
        console.log(update);
        if (err) {
            generateResponse(false, 'Unable to update Employee', null, res);
        }
        generateResponse(true, 'New Interview Details Added', update, res);
    });

}

export function createEmployeeLeavetype(req, res) {

    let body = parseBody(req);
    let add_leave_type = {};
    let employee_number = body['employee_number'];

    add_leave_type['name'] = body['name'];
    add_leave_type['total'] = body['total'];

    Employee.updateEmployee({ 'employment_details.employee_number': employee_number, "leave_details.name": add_leave_type['name'] }, { "$set": { "leave_details.$.total": add_leave_type['total'] } }, (err, response) => {

        if (err) {
            generateResponse(true, "Unable to Update", response, res);
        }
        generateResponse(true, "Successfully Updated Leave Requests", response, res);

    });
}

export async function getEmploymentLogs(req, res) {

    try {

        let employee_id = req.query.id;
        let employmentLogs = await EmploymentDuration.getEmploymentDuration({'employee' : employee_id})
        generateResponse(true, "Employment Logs fetched successfully", employmentLogs, res);
    }
    catch(e){

        generateResponse(false, "Unable to fetch employment Logs", null, res);

    }
    
}