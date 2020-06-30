import { parseBody, generateResponse, processSalary, calculateBenefitsOnSalary } from '../utilites';
/* import { decryptValue } from '../utilites/encryption-module'; */
import { generateUnit } from '../generators/unit-generator';
import { generateEmployee } from '../generators/employee-generator';
import UserDocument from '../models/document';
import Employee from '../models/employee';
import Department from '../models/department'
import EmployeeAttendance from '../models/employeeattendance';
import EmployeeFingerprint from '../models/employeefingerprint';
import Unit from '../models/unit';
import TransferRequest from '../models/transferrequest';
import LeaveRequest from '../models/leaverequest';
import { TRANSFER_TYPES, TRANSFER_REQUEST_STATUS, LEAVE_REQUEST_STATUS } from '../utilites/constants';
import fs from 'fs';
import _ from 'lodash';
import moment from 'moment';
import { setLeavesOnEmployeeAttendance } from './leaverequestcontroller';


export function addDocument(req, res) {

    let body = parseBody(req);
    UserDocument.addUserDocument(body, (err, createResponse) => {

        if (err) {
            generateResponse(false, "Unable to Create Document", null, res);
        }
        generateResponse(true, "Successfully Created Document", createResponse, res);

    });

}
export async function getStaticJsonData(req, res) {

    let data = JSON.parse(fs.readFileSync('./assets/json/static-data.json', 'utf8'));
    /* console.log(data); */
    generateResponse(true, "all static data fetched", data, res);

}

export async function addReportinglineInDept(req, res) {

    try {
        let body = parseBody(req);


        let updateObj = {
            "$push": {
                "requestline": body
            }
        };

        let updation = await Department.updateManyDepartment({}, updateObj);
        generateResponse(true, "reportline created succesfully", updation, res);

    } catch (error) {
        console.log(error);
        generateResponse(false, "error", null, res);
    }


}

export function getAllUserDocuments(req, res) {

    let queryParams = {
        page: req.query.page || 1,
        limit: req.query.limit || 100,
    };


    UserDocument.getUserDocuments(queryParams, (err, documents) => {
        if (err) {
            console.log(err);
            generateResponse(false, "Unable to Fetch Documents", null, res);
        }

        /*  generateResponse(true, "Fetch Documents", documents, res); */
        UserDocument.countUserDocuments((err, count) => {

            if (err) {
                console.log('>>>', err);
                generateResponse(false, "Unable to Fetch Documents", null, res);

            }

            if (count != 0) {
                let data = {
                    documents: documents,
                    current: queryParams.page,
                    pages: Math.ceil(count / queryParams.limit),
                    totalrecords: count
                }
                generateResponse(true, "Fetch Documents", data, res);
            }
            else {
                let data = {
                    documents: documents,
                    current: queryParams.page,
                    pages: queryParams.page,
                    totalrecords: count
                }
                generateResponse(true, "Fetch Documents", data, res);
            }
        });

    });

}

export async function generateEmployeeRandomData(req, res) {

    let data_limit = 4;
    let employees = [];

    for (let i = 0; i < data_limit; i++) {

        const emp = generateEmployee(i + 5000);
        employees.push(emp);
    }

    let data = await Employee.addManyEmployees(employees);
    generateResponse(true, "Employees Generated", data, res);

}

export async function generateUnitRandomData(req, res) {

    let data_limit = 5;
    let units = [];

    for (let i = 0; i < data_limit; i++) {

        const unit = generateUnit(i + 400);
        units.push(unit);
    }
    let data = await Unit.addManyUnits(units);
    generateResponse(true, "Units Generated", data, res);
}

export async function tempTransfer(req, res) {

    let current_date = new Date();

    current_date = `${current_date.getFullYear()}-${current_date.getMonth() + 1}-${current_date.getDate()}`
    console.log(current_date);

    TransferRequest.getTransferRequests({ 'transfer_to_date': current_date, 'transfer_type': TRANSFER_TYPES[0], 'request_status': [TRANSFER_REQUEST_STATUS['approved']] }, async (err, transfers) => {
        if (err) {
            generateResponse(false, "Transfers cannot be fetched", null, res);
        }
        else {

            console.log(transfers.length);
            for (let i = 0; i < transfers.length; i++) {
                const transfer = transfers[i];

                console.log(transfer);
                let updateObj = {};
                let updateTransferStatus = {};
                updateObj['employment_details.department'] = transfer['transfer_details']['tranfer_from']['department']['_id'];
                updateObj['employment_details.unit'] = transfer['transfer_details']['tranfer_from']['unit']['_id'];
                let employee = transfer['transfer_for_employee']['_id']
                updateTransferStatus['request_status'] = TRANSFER_REQUEST_STATUS['reversed'];
                console.log('Update', updateObj);

                Employee.updateEmployee({ '_id': employee }, updateObj, (err, update) => {
                    console.log('Employee', update);
                    if (err) {
                        generateResponse(false, 'Unable to update Employee', err.message, res);
                    }
                    TransferRequest.updateTransferRequest({ '_id': transfer['_id'] }, updateTransferStatus, (err, response) => {
                        if (err) {
                            console.log(err);
                            generateResponse(false, "Unable to Update Transfer Request", null, res);
                        }

                    });
                });
            }

            generateResponse(true, "Employee Transfer Reversed Successfully", transfers.length, res);

        }
    });

}

export async function updateUserRoles(req, res) {
    let updateObj = {};


    updateObj['basic_details.role'] = '5bf7e3dceca3ae4df4159dcd';


    let update = await Employee.updateManyEmployee({}, updateObj);
    generateResponse(true, 'Roles Updated', update, res);
}

export async function updateEmployeesData(req, res) {

    /* let employees = await Employee.getEmployee({ 'basic_details.role': '5bf7e3dceca3ae4df4159dcd' });
    let count_of_employees = await Employee.countEmployee({ 'basic_details.role': '5bf7e3dceca3ae4df4159dcd' });

    let employees_set = _.map(employees, (obj) => {

        const emp = {
            status:
            {
                is_deleted: obj['status']['is_deleted'],
                is_activated: obj['status']['is_activated'],
                is_leaves_allowed: obj['status']['is_leaves_allowed']
            },
            basic_details:
            {
                firstname: obj['basic_details']['firstname'],
                lastname: obj['basic_details']['lastname'],
                cnic: obj['basic_details']['cnic'],
                email: obj['basic_details']['email'],
                dob: obj['basic_details']['dob'],
                contact_one: obj['basic_details']['contact_one'],
                contact_two: obj['basic_details']['contact_two'],
                gender: obj['basic_details']['gender'],
                blood_group: obj['basic_details']['blood_group'],
                nationality: obj['basic_details']['nationality'],
                role: obj['basic_details']['role']['_id'],
                profile_image: obj['basic_details']['profile_image']
            },
            employment_details:
            {
                employee_type: obj['employment_details']['employee_type'],
                password: obj['employment_details']['password'],
                employee_number: obj['employment_details']['employee_number'],
                department: obj['employment_details']['department']['_id'],
                unit: obj['employment_details']['unit']['_id'],
                confirmation_date: obj['employment_details']['confirmation_date'],
                joining_date: obj['employment_details']['joining_date'],
                prefix: obj['employment_details']['prefix'],
                contract_period: obj['employment_details']['contract_period'],
                designation: obj['employment_details']['designation'],
                grade: obj['employment_details']['grade'],
                salary: obj['employment_details']['salary'],
                payment_type: obj['employment_details']['payment_type'],
                account_details:
                {
                    bank_name: obj['employment_details']['account_details']['bank_name'],
                    acc_number: obj['employment_details']['account_details']['acc_number'],
                    branch: obj['employment_details']['account_details']['branch'],
                    attachment: obj['employment_details']['account_details']['attachment']
                }
            },
            location_details:
            {
                address: obj['location_details']['address'],
                city: obj['location_details']['city'],
                country: obj['location_details']['country']
            },
            family_details: {
                martial_status: obj['family_details']['martial_status'],
                spouses: obj['family_details']['spouses'],
                children: obj['family_details']['children'],
                family_members : obj['family_details']['family_members']

            },
            leave_details : obj['leave_details'],
            professional_experience_details : obj['professional_experience_details'],
            emergency_contacts : obj['emergency_contacts'],
            education_details : obj['education_details'],
            document_details : obj['document_details'],
            benefits_details : obj['benefits_details'],
            assets_details : obj['assets_details'], 
            financial_penalties  : obj['financial_penalties'],
            transfer_logs : obj['transfer_logs']
        }

        return emp;

    });



    let data = {
        employees: employees_set
    }

    fs.appendFileSync('./assets/json/employees.json', JSON.stringify(data), "UTF-8", { 'flags': 'a+' });
    generateResponse(false, 'Data Writed on employees.json', count_of_employees, res); */


    /* let raw_employees = fs.readFileSync('./assets/json/employees.json');
    let employees_data = JSON.parse(raw_employees);
    let employee_attendances = _.map(employees_data['employees'], (obj) => {

        const temp_attendance_emp = {

            employee_number: obj['employment_details']['employee_number'],
            attendance_details: []

        }
        return temp_attendance_emp;
    });


    let employee_fingerprints = _.map(employees_data['employees'], (obj) => {

        const temp_emp_fingerprint = {

            employee_number: obj['employment_details']['employee_number'],
            fingerprint_data: []

        }
        return temp_emp_fingerprint;
    }); */

    /* let insert_employees = await Employee.addManyEmployees(employees_data['employees']); */
    /* let insert_employee_attendances = await EmployeeAttendance.addManyEmployeeAttendance(employee_attendances); */
    /* let insert_employee_fingerprints = await EmployeeFingerprint.addManyEmployeeFingerprints(employee_fingerprints); */

    /* let updates = {}
    generateResponse(false, 'Test', updates, res); */

    let updateData = {

        $set : {

            'employment_details.quit_date' : null,
            'employment_details.shift_timings' : {
                time_in : {
                    hour : '00',
                    min : '00'
                },
                time_out : {
                    hour : '00',
                    min : '00'
                }
            },


        }

    }

    let updation = await Employee.updateManyEmployee({}, updateData);
    generateResponse(true, "Update employees details", updation, res);


}
/* Temporary APIs */
export async function updateUnitTime(req, res) {


    /* let units = await Unit.getUnitV2({}); */


    let updateObj = {

        $set: {
            'configuration.working_hours': {

                from: {

                    hour: '09',
                    min: '00'
                },
                to: {

                    hour: '18',
                    min: '00'
                }
            }
        }
    };


    /* let updataParam = { _id: '5c874d9e847a2b0cf87adae4' }; */

    try {
        let result = await Unit.updateManyUnit({}, updateObj);
        generateResponse(true, 'Units Updated', result, res);
    }
    catch (e) {
        console.log(e);
        generateResponse(false, 'Unable to update Unit', null, res);
    }




}

export async function updateAttendanceDetails(req, res) {

    /* let updateObj = {

        $set: {

            attendance_details: []
        }
    }
    let updation = await EmployeeAttendance.updateManyEmployeeAttendance({}, updateObj);
    generateResponse(true, "Empty attendance_details", updation, res); */


    let employees = await Employee.getEmployee({});
    employees = _.map(employees, (obj) => {
        const empAttendanceObj = {
            employee_number: obj['employment_details']['employee_number'],
            attendance_details: []
        };
        return empAttendanceObj;
    });

    let attendanceCreation = await EmployeeAttendance.addManyEmployeeAttendance(employees);
    generateResponse(true, "Employee Attendance", attendanceCreation, res);

}


export async function updateEmployeeSalaryDetails(req, res) {


    let employees = await Employee.getSpecificEmployeeV2({}, 'basic_details employment_details');

    Promise.all(_.map(employees, (emp) => {


        let updateParam = {
            '_id': emp['_id']
        };

        let updateObj = {

            $set: {

                'employment_details.salary': processSalary(emp['employment_details']['salary']),
                'employment_details.benefits': calculateBenefitsOnSalary(emp['employment_details']['salary'])
            }

        };

        Employee.updateEmployee(updateParam, updateObj, (err, updation) => {

            console.log(updation);

            return updation

        });



    })).then((results) => {

        generateResponse(true, "Salarys Updated", results, res);


    });

}



export async function tempSetLeaveDays(req, res){

    let afterTwoDaysOfCurrentDate = moment().add(2, 'd').toDate();
    /* Time Zone Issue Exist */
    let from = new Date(afterTwoDaysOfCurrentDate.getFullYear(), afterTwoDaysOfCurrentDate.getMonth(), afterTwoDaysOfCurrentDate.getDate(), 5,0,0);
    console.log(from);



    LeaveRequest.getLeaveRequests({from : from, to : from, request_status : [LEAVE_REQUEST_STATUS['approved']] }, async (err, requests)=>{
        
        
        requests.forEach(async (r)=>{

           console.log(r['employee']['employment_details']['employee_number'], [from]);
           await setLeavesOnEmployeeAttendance(r['employee']['employment_details']['employee_number'], [from])

        });
        generateResponse(false, "test cron", requests, res);

    });
    
}

