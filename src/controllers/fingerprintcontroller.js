import { parseBody, generateResponse } from "../utilites";
import EmployeeFingerprint from '../models/employeefingerprint';

export async function enrollEmployeeFingerprint(req, res) {

    let body = parseBody(req);
    console.log(body);

    let employee_number = body['employee_number'];

    let employee = await EmployeeFingerprint.getSpecificEmployeeFingerprint({ 'employee_number': employee_number });


    if (employee.length > 0) {
        let updateFingerPrint = {
            $push: {
                'fingerprint_data': body['fingerprint']
            }
        }


        let update = await EmployeeFingerprint.updateEmployeeFingerprint({ 'employee_number': employee_number }, updateFingerPrint);
        console.log(update);
        generateResponse(true, 'Fingerprint Updated Successfully', update, res);
    }
    else {
        let insertEmployee = {
            employee_number: body['employee_number'],
            fingerprint_data: body['fingerprint']
        };

        let insert = await EmployeeFingerprint.addEmployeeFingerprint(insertEmployee);

        generateResponse(true, 'Fingerprint Created Successfully', insert, res);
    }
}

export async function getSpecificEmployeeFingerprintData(req, res) {

    let employee_number = req.params.id;

    try {
        let employee = await EmployeeFingerprint.getSpecificEmployeeFingerprint({'employee_number': employee_number });
        if (employee.length > 0) {
            employee = employee[0];
            generateResponse(true, 'Employee Found', employee, res);
        }
        else {
            generateResponse(false, 'Employee Not Found', null, res);
        }
    }
    catch (e) {
        console.log(e);
        generateResponse(false, 'Error Found', null, res);
    }
}


export async function createEmployeeFingerprint(req, res){
    let body = parseBody(req);

    let insertEmployee = {
        employee_number: body['employee_number'],
        fingerprint_data: []
    };

    let insert = await EmployeeFingerprint.addEmployeeFingerprint(insertEmployee);
    generateResponse(true, 'Employee Created in Attendance Successfully', insert, res);
}