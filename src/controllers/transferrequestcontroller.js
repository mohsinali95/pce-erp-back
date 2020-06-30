import { parseBody, generateResponse, calculateDurationBetweenDates } from '../utilites';
import TransferRequest from '../models/transferrequest';
import Department from '../models/department';
import Employee from '../models/employee';
import Unit from '../models/unit';
import EmployeeFingerprint from '../models/employeefingerprint';
import { REQUEST_TYPE, TRANSFER_REQUEST_STATUS, SYSTEM_EMPLOYEES } from '../utilites/constants';
import { initiatePriorityIndex } from './requestprocesscontroller';
import async from 'async';
import moment from 'moment';
import _ from 'lodash';
import mongoose from 'mongoose';
/* REQUEST TYPE -> 2 = Transfer */
export async function createNewTranferRequest(req, res) {
    console.time('st');
    let body = parseBody(req);
    let transfer_for_employee = body['transfer_details']['employee'];
    let createRequest = {};

    try {
        let requestsCount = await TransferRequest.countTransferRequests({});
        let transfer_for_employee_details = await Employee.getSpecificEmployeeV2({ '_id': transfer_for_employee });
        transfer_for_employee_details = transfer_for_employee_details[0];

        let currentDeptId = transfer_for_employee_details['employment_details']['department']['_id'];
        let currentUnitId = transfer_for_employee_details['employment_details']['unit']['_id']

        createRequest['transfer_id'] = `TF-${requestsCount + 1}`;
        createRequest['transfer_type'] = body['transfer_type'];
        createRequest['last_transfer_date'] = await getLastTransferDate(transfer_for_employee_details)
        createRequest['transfer_date'] = body['transfer_date'];
        createRequest['transfer_from_date'] = body['transfer_from_date'];
        createRequest['transfer_to_date'] = body['transfer_to_date'];
        createRequest['transfer_reason'] = body['transfer_reason'];
        createRequest['replacement_employee'] = null;
        createRequest['generated_by'] = req.payload._id;
        createRequest['transfer_for_employee'] = transfer_for_employee;
        createRequest['transfer_details'] = {
            transfer_to: {
                unit: body['transfer_details']['unit'],
                department: body['transfer_details']['department']
            },
            transfer_from: {
                unit: currentUnitId,
                department: currentDeptId
            }
        }
        createRequest['extra_fields'] = body['extra_fields']
        createRequest['replacement_employee'] = null;


        if (body['is_urgent'] == true) {

            createRequest['is_urgent'] = body['is_urgent'];
            createRequest['request_next_order'] = 0;
            createRequest['request_status'] = TRANSFER_REQUEST_STATUS['approved'];
            createRequest['department'] = null
            /* generateResponse(true, "Successfully Created Transfer Requests", createRequest, res); */
            TransferRequest.addTransferRequest(createRequest, (err, onTransferCreation) => {
                if (err) {
                    console.log(err);
                    generateResponse(false, "Unable to Create Transfer Request", null, res);
                }
                else {
                    let employeeUpdate = {
                        $push: {
                            'transfer_logs': onTransferCreation['_id']
                        }
                    };

                    employeeUpdate['employment_details.department'] = body['transfer_details']['department'];
                    employeeUpdate['employment_details.unit'] = body['transfer_details']['unit'];

                    Employee.updateEmployee({ _id: transfer_for_employee }, employeeUpdate, (err, update) => {
                        console.log(update);
                        if (err) {
                            generateResponse(false, 'Unable to update Employee', null, res);
                        }
                        generateResponse(true, "Successfully Created Transfer Requests", onTransferCreation, res);
                    });

                }
            });

        }
        else {
            let transferRequestReportingline = transfer_for_employee_details['employment_details']['department']['requestline'].find(o => o.request_type === REQUEST_TYPE[2]);
            console.log(transferRequestReportingline);
            if (transferRequestReportingline.priority_order.length == 0) {
                generateResponse(false, "Sorry No Manager Exist in Transfer Reportline", null, res);
            }
            else {
                let priority_index = initiatePriorityIndex(transferRequestReportingline.priority_order);
                console.log('Assign to: ', priority_index);
                createRequest['request_next_order'] = priority_index;
                createRequest['department'] = currentDeptId;
                createRequest['is_urgent'] = false;
                TransferRequest.addTransferRequest(createRequest, function (err, result) {
                    if (err) {
                        console.log(err);
                        generateResponse(false, "Unable to Create Transfer Request", null, res);
                    }
                    else {
                        console.timeEnd('st');
                        generateResponse(true, "Successfully Created Transfer Request", result, res);
                    }

                });

            }
        }
    }
    catch (e) {
        console.log(e);
        generateResponse(false, "Unable to Create Transfer Request", null, res);

    }
}

export async function countTransferRequests(req, res) {

    let body = parseBody(req);
    let query = {
        request_status: body.request_status
    };
    console.log(query);
    try {
        let counts = await TransferRequest.countTransferRequests(query);
        generateResponse(true, "Successfully Counted Transfer Requests", counts, res);
    }
    catch (e) {
        console.log(e);
        generateResponse(false, "Unable to Count Transfer Requests", null, res);
    }

}

export async function getTransferRequests(req, res) {

    let queryParams = {
        page: req.query.page || 1,
        limit: req.query.limit || 10,
        sort: req.query.sort,
        sortby: req.query.sortby,
        request_status: req.query.request_status,
        /*  employee : req.query.employee */
    };

    if (queryParams['request_status']) {
        queryParams['request_status'] = queryParams['request_status'].split(",");
    }

    TransferRequest.getTransferRequests(queryParams, (err, transferrequests) => {
        if (err) {
            console.log(err);
            generateResponse(false, "Unable to Fetch Transfer Requests", null, res);
        }
        let getDepReportlinetFunctions = [];
        transferrequests.forEach(element => {

            if (element['department'] != null) {

                const deptId = element['department']['_id'];

                getDepReportlinetFunctions.push(async (callback) => {

                    try {
                        let deptDetail = await Department.getSpecificDepartmentV2({ _id: deptId });
                        let TransferRequestReportingline = deptDetail[0]['requestline'].find(o => o.request_type === REQUEST_TYPE[2]);
                        callback(null, TransferRequestReportingline['priority_order']);
                    }
                    catch (e) {
                        console.log(e);
                        generateResponse(false, "Unable to Fetch Transfer Requests", null, res);
                    }
                });
            }
            else {
                getDepReportlinetFunctions.push(async (callback) => {

                    callback(null, []);

                });
            }
        });

        async.parallel(getDepReportlinetFunctions, async (err, reportline) => {

            for (let i = 0; i < transferrequests.length; i++) {
                transferrequests[i]['requestline'] = reportline[i];
            }
            try {

                let count = await TransferRequest.countTransferRequests(queryParams);
                if (count != 0) {
                    let data = {
                        data: transferrequests,
                        current: queryParams.page,
                        pages: Math.ceil(count / queryParams.limit),
                        totalrecords: count
                    }
                    generateResponse(true, "Fetch Transfer Requests", data, res);
                }
                else {
                    let data = {
                        data: transferrequests,
                        current: queryParams.page,
                        pages: queryParams.page,
                        totalrecords: count
                    }
                    generateResponse(true, "Fetch Transfer Requests", data, res);
                }
            }
            catch (e) {
                console.log(e);
                generateResponse(false, "Unable to Fetch Transfer Requests", null, res);
            }
        });
    });
}


export async function getTransferRequestsV2(req, res) {

    try {

        let queryParams = {
            page: req.query.page || 1,
            limit: req.query.limit || 10,
            sort: req.query.sort || '',
            sortby: req.query.sortby || '',
            request_status: req.query.request_status,
            search: req.query.search || ''
        };

        let userPayload = req.payload;
        console.log(userPayload);

        if (queryParams['request_status']) {
            queryParams['request_status'] = queryParams['request_status'].split(",").map(i => parseInt(i, 10));
        }
        else {

            queryParams['request_status'] = _.values(TRANSFER_REQUEST_STATUS);

        }

       

        let pipeline = [

            { $unwind: "$transfer_details" },
            { $unwind: "$transfer_details.transfer_to" },
            { $unwind: "$transfer_details.transfer_from" },
            {
                $lookup: {
                    "from": 'units',
                    "localField": "transfer_details.transfer_to.unit",
                    "foreignField": "_id",
                    "as": "transfer_details.transfer_to.unit"
                }
            },
            {
                $lookup: {
                    "from": 'units',
                    "localField": "transfer_details.transfer_from.unit",
                    "foreignField": "_id",
                    "as": "transfer_details.transfer_from.unit"
                }
            },
            {
                $lookup: {
                    "from": 'departments',
                    "localField": "transfer_details.transfer_from.department",
                    "foreignField": "_id",
                    "as": "transfer_details.transfer_from.department"
                }
            },


            { $unwind: "$transfer_details.transfer_to.unit" },
            { $unwind: "$transfer_details.transfer_from.unit" },
            { $unwind: "$transfer_details.transfer_from.department" },
            /* Look up for Department */
            {
                $lookup: {
                    "from": 'departments',
                    "localField": "department",
                    "foreignField": "_id",
                    "as": "department"
                }
            },
            { $unwind: "$department" },
            /* For Transfer Employee */
            {
                $lookup: {
                    "from": 'employees',
                    "localField": "transfer_for_employee",
                    "foreignField": "_id",
                    "as": "transfer_for_employee"
                }
            },
            { $unwind: "$transfer_for_employee" },
            /* For Replacement Employee */
            {
                $lookup: {
                    "from": 'employees',
                    "localField": "replacement_employee",
                    "foreignField": "_id",
                    "as": "replacement_employee"
                }
            },
            {
                $match: {
                    $or: [
                        { 'transfer_for_employee.basic_details.firstname': { $regex: queryParams.search, $options: 'i' } },
                        { 'transfer_for_employee.basic_details.lastname': { $regex: queryParams.search, $options: 'i' } },
                        { 'transfer_for_employee.employment_details.employee_number': { $regex: queryParams.search, $options: 'i' } },

                    ],
                    'request_status': { $in: queryParams['request_status'] },
                }
            }
         
        ];  





        let transfers = await TransferRequest.aggregate(pipeline);

        let getDepReportlinetFunctions = [];
        transfers.forEach(element => {

            if (element['department'] != null) {

                const deptId = element['department']['_id'];
                

                getDepReportlinetFunctions.push(async (callback) => {

                    try {
                        let deptDetail = await Department.getSpecificDepartmentV2({ _id: deptId });
                        let TransferRequestReportingline = deptDetail[0]['requestline'].find(o => o.request_type === REQUEST_TYPE[2]);
                        callback(null, TransferRequestReportingline['priority_order']);
                    }
                    catch (e) {
                        console.log(e);
                        generateResponse(false, "Unable to Fetch Transfer Requests", null, res);
                    }
                });
            }
            else {
                getDepReportlinetFunctions.push(async (callback) => {

                    callback(null, []);

                });
            }
        });

        async.parallel(getDepReportlinetFunctions, async (err, reportline) => {

            let filteredTransfers = [];


            for (let i = 0; i < transfers.length; i++) {

                transfers[i]['requestline'] = reportline[i];

                for (let j = 0; j < transfers[i]['requestline'].length; j++) {
                    const element = transfers[i]['requestline'][j];

                    console.log(element['department']['_id'], userPayload['department'])

                    if(element['department']['_id'].toString() === userPayload['department'] || SYSTEM_EMPLOYEES.includes(userPayload['employee_number'])){

                        filteredTransfers.push(transfers[i])

                    }
                    
                }


                console.log(transfers[i]['requestline']);
            }


            

            try {

                generateResponse(true, "Fetch Transfer Requests", filteredTransfers, res);
            }
            catch (e) {
                console.log(e);
                generateResponse(false, "Unable to Fetch Transfer Requests", null, res);
            }
        });

    }
    catch (e) {
        console.log(e);
        generateResponse(false, "Unable to Fetch Transfer Requests", null, res);
    }


}

export async function getSpecificTransferRequest(req, res) {

    let transferrequestid = req.params['transferrequestid'];

    try {

        let transferrequestdata = await TransferRequest.getSpecificTransferRequest({ _id: transferrequestid });
        generateResponse(true, "Request fetched successfully", transferrequestdata, res);

    }
    catch (e) {

        console.log(e);
        generateResponse(false, "Unable to fetch Request", null, res);
    }

}


export async function getTransferRequestPrint(req, res) {

    let transferrequestid = req.params['transferrequestid'];

    try {

        let transferrequestdata = await TransferRequest.getSpecificTransferRequest({ _id: transferrequestid });
        transferrequestdata = transferrequestdata[0];
        let created_date = new Date(transferrequestdata['timestamps']['created_at']);
        created_date = `${created_date.getFullYear()}-${created_date.getMonth() + 1}-${created_date.getDate()}`;
        let transfer_from_date = new Date(transferrequestdata['transfer_from_date']);
        transfer_from_date = `${transfer_from_date.getFullYear()}-${transfer_from_date.getMonth() + 1}-${transfer_from_date.getDate()}`;
        let last_transfer_date = new Date(transferrequestdata['last_transfer_date']);

        let transfer_to_date = '';
        console.log(transferrequestdata['transfer_to_date']);
        if (typeof transferrequestdata['transfer_to_date'] === null) {

            transfer_to_date = new Date(transferrequestdata['transfer_to_date']);
            transfer_to_date = `${transfer_to_date.getFullYear()}-${transfer_to_date.getMonth() + 1}-${transfer_to_date.getDate()}`;
        }


        let transfer_date = new Date(transferrequestdata['transfer_date']);
        transfer_date = `${transfer_date.getFullYear()}-${transfer_date.getMonth() + 1}-${transfer_date.getDate()}`;

        let joining_date = new Date(transferrequestdata['transfer_for_employee']['employment_details']['joining_date']);
        joining_date = `${joining_date.getFullYear()}-${joining_date.getMonth() + 1}-${joining_date.getDate()}`;

        transferrequestdata['status_log'] = _.map(transferrequestdata['status_log'], (obj, index) => {

            let temp_date = new Date(obj['action_by']['timestamps']['updated_at']);
            temp_date = `${temp_date.getFullYear()}-${temp_date.getMonth() + 1}-${temp_date.getDate()}`;
            obj['action_by']['timestamps']['updated_at'] = temp_date
            return obj;
        });

        let working_duration = '';
        let employeeDetails = await Employee.getSpecificEmployeeV2({ '_id': transferrequestdata['transfer_for_employee']['_id'] }, 'transfer_logs');
        employeeDetails = employeeDetails[0];
        working_duration = calculateDurationBetweenDates(last_transfer_date, transfer_from_date)
        /* console.log(transfers); */
        /* if(transfers.length > 1){


            console.log('if aya');

           let previous_transfer_id  = transfers[transfers.length-2];
         
           let previous_transfer_details = await TransferRequest.getSpecificTransferRequest({ _id: previous_transfer_id });
           previous_transfer_details = previous_transfer_details[0];
           console.log('Previous Date', previous_transfer_details['transfer_from_date'], 'Current Date', transfer_from_date);
           working_duration = calculateDurationBetweenDates(previous_transfer_details['transfer_from_date'], transfer_from_date)
           console.log(working_duration);
        }
        else{

            console.log('else aya');
            working_duration = calculateDurationBetweenDates(joining_date, transfer_from_date)
        } */

        let data = {
            employee_number: transferrequestdata['transfer_for_employee']['employment_details']['employee_number'],
            employee_firstname: transferrequestdata['transfer_for_employee']['basic_details']['firstname'],
            employee_lastname: transferrequestdata['transfer_for_employee']['basic_details']['lastname'],
            employee_address: transferrequestdata['transfer_for_employee']['location_details']['address'],
            employee_city: transferrequestdata['transfer_for_employee']['location_details']['city'],
            employee_country: transferrequestdata['transfer_for_employee']['location_details']['country'],
            employee_joining_date: joining_date,
            employee_designation: transferrequestdata['transfer_for_employee']['employment_details']['designation'],
            employee_salary: transferrequestdata['transfer_for_employee']['employment_details']['salary'],
            employee_transfer_from_department: transferrequestdata['transfer_details']['transfer_from']['department']['name'],
            employee_transfer_from_unit: transferrequestdata['transfer_details']['transfer_from']['unit']['name'],
            employee_transfer_to_department: transferrequestdata['transfer_details']['transfer_to']['department']['name'],
            employee_transfer_to_unit: transferrequestdata['transfer_details']['transfer_to']['unit']['name'],
            employee_transfer_reason: transferrequestdata['transfer_reason'],
            transfer_date: transfer_date,
            report_date: transfer_from_date,
            end_date: transfer_to_date,
            working_duration: working_duration,
            approvals: transferrequestdata['status_log']
        }
        generateResponse(true, "Request fetched successfully", data, res);

    }
    catch (e) {

        console.log(e);
        generateResponse(false, "Unable to fetch Request", null, res);
    }

}

export async function updateStatusTransferRequest(req, res) {

    let body = parseBody(req);
    let userPayload = req.payload;
    let request_id = req.query['request_id'];

    body['replacement_employee'] = body['replacement_employee'] || null;

    let updateParam = {
        '_id': request_id
    };

    try {

        let requestDetails = await TransferRequest.getSpecificTransferRequest(updateParam, '');
        requestDetails = requestDetails[0];
        let status_log = requestDetails['status_log'];
        let department = await Department.getSpecificDepartmentV2({ _id: requestDetails['department'] });
        let transferRequestReportline = department[0]['requestline'].find(o => o.request_type === REQUEST_TYPE[2]);
        let priority_order_array = transferRequestReportline['priority_order'];

        let requestToSend = priority_order_array[requestDetails['request_next_order'] - 1]['department']['manager']['_id'];

        console.log('c e', userPayload['_id']);
        console.log('p e', requestToSend);

        if (userPayload['_id'] == requestToSend && priority_order_array[requestDetails['request_next_order'] - 1]['status'] == true) {

            let request_current_order = requestDetails['request_next_order'];
            let request_next_order = 0;
            let updateData = {};
            let filteredPriorityOrderArray = priority_order_array.filter((item) => {
                return item['status'] == true;
            });

            if (requestDetails['request_status'] == TRANSFER_REQUEST_STATUS['pending']) {
                if (body['request_status'] == TRANSFER_REQUEST_STATUS['approved']) {
                    if (filteredPriorityOrderArray.length == status_log.length) {
                        generateResponse(true, "Requested has been Completed, No further Action needed", null, res);
                    }
                    else {
                        for (let i = request_current_order; i <= priority_order_array.length; i++) {
                            console.log('value of i', i);
                            if (filteredPriorityOrderArray.length == status_log.length + 1) {
                                console.log('if');
                                if (priority_order_array[i - 1]['status'] == true) {
                                    request_next_order = i;
                                }
                                else {
                                    request_next_order = request_current_order;
                                }
                            }
                            else {
                                console.log('else');
                                if (priority_order_array[i - 1]['status'] == true && request_current_order !== i) {
                                    request_next_order += i;
                                    break;
                                }
                            }
                        }
                        console.log('Next Order', request_next_order);
                        console.log('Current Order', request_current_order);
                        if (filteredPriorityOrderArray.length == status_log.length + 1) {


                            updateData = {
                                'request_status': body['request_status'],
                                'request_next_order': request_next_order,
                                'replacement_employee': body['replacement_employee'],
                                $push: {
                                    'status_log': {
                                        'status': body['request_status'],
                                        'action_by': userPayload['_id'],
                                        'updated_at': new Date
                                    }
                                }
                            };
                            //console.log(body['department']);
                            updateData['transfer_details'] = {

                                transfer_to: {
                                    unit: requestDetails['transfer_details']['transfer_to']['unit'],
                                    department: body['department']
                                },
                                transfer_from: {
                                    unit: requestDetails['transfer_details']['transfer_from']['unit'],
                                    department: requestDetails['transfer_details']['transfer_from']['department']
                                }

                            };
                            /* Add Employee Log here */
                            let employeeDetails = await Employee.getSpecificEmployeeV2({ _id: requestDetails['transfer_for_employee']['_id'] });
                            employeeDetails = employeeDetails[0];


                            let employeeUpdateData = {
                                $push: {
                                    'transfer_logs': requestDetails['_id']
                                }
                            };

                            employeeUpdateData['employment_details.department'] = body['department'];
                            employeeUpdateData['employment_details.unit'] = requestDetails['transfer_details']['transfer_to']['unit'];
                            //generateResponse(true, "Successfully Updated Transfer Requests", requestDetails['transfer_for_employee']['_id'], res);
                            Employee.updateEmployee({ _id: requestDetails['transfer_for_employee']['_id'] }, employeeUpdateData, (err, update) => {
                                console.log(update);
                                if (err) {
                                    generateResponse(false, 'Unable to update Employee', null, res);
                                }
                                else {
                                    TransferRequest.updateTransferRequest(updateParam, updateData, (err, response) => {
                                        if (err) {
                                            console.log(err);
                                            generateResponse(false, "Unable to Update Transfer Request", null, res);
                                        }
                                        let is_approved_check = {

                                            is_approved: true

                                        };

                                        generateResponse(true, "Successfully Updated Transfer Requests", is_approved_check, res);
                                    });
                                }

                            });
                        }
                        else {
                            updateData = {
                                'request_status': TRANSFER_REQUEST_STATUS['pending'],
                                'request_next_order': request_next_order,
                                'replacement_employee': body['replacement_employee'],
                                $push: {
                                    'status_log': {
                                        'status': TRANSFER_REQUEST_STATUS['pending'],
                                        'action_by': userPayload['_id'],
                                        'updated_at': new Date
                                    }
                                }
                            };
                            //generateResponse(true, "Successfully Updated Transfer Requests", updateData, res);
                            TransferRequest.updateTransferRequest(updateParam, updateData, (err, response) => {
                                if (err) {
                                    console.log(err);
                                    generateResponse(false, "Unable to Update Transfer Request", null, res);
                                }

                                let is_approved_check = {

                                    is_approved: false

                                };
                                generateResponse(true, "Successfully Updated Transfer Requests", is_approved_check, res);
                            });
                        }
                    }
                }
                else if (body['request_status'] == TRANSFER_REQUEST_STATUS['rejected']) {

                    if (filteredPriorityOrderArray.length == status_log.length) {
                        generateResponse(true, "Requested has been Completed, No further Action needed", null, res);
                    }
                    else {
                        updateData = {
                            'request_status': body['request_status'],
                            'request_next_order': request_current_order,
                            $push: {
                                'status_log': {
                                    'status': body['request_status'],
                                    'action_by': userPayload['_id'],
                                    'updated_at': new Date
                                }
                            }
                        };
                        updateData['closing_reason'] = body['closing_reason'];
                        TransferRequest.updateTransferRequest(updateParam, updateData, (err, response) => {
                            if (err) {
                                console.log(err);
                                generateResponse(false, "Unable to Update Transfer Request", null, res);
                            }
                            generateResponse(true, "Successfully Updated Transfer Requests", response, res);
                        });
                    }
                }
            }
            else {
                generateResponse(false, "Request is not on pending", null, res);
            }
        }
        else {
            generateResponse(false, "Unauthorized request", null, res);
        }
    }
    catch (e) {
        console.log(e);
        generateResponse(false, "error", null, res);
    }
}

export async function employeeTransferSearch(req, res) {
    let body = parseBody(req);

    let unitDetails = await Unit.getSpecificUnit({ 'code': body['code'] });
    unitDetails = unitDetails[0];
    let unit_id = unitDetails['_id'];
    let current_date = moment(body['current_date'], 'YYYY-MM-DD');
    let next_day_date = moment(current_date).add(1, 'days');

    TransferRequest.getTransferRequests({ 'transfer_details.transfer_to.unit': unit_id, request_status: [TRANSFER_REQUEST_STATUS['approved']] }, (err, transfers) => {

        if (err) {
            generateResponse(false, "Unable to fetch Transfers", null, res);
        }
        let employeeFingerprintCallbacks = [];
        transfers.forEach((obj) => {

            let from_date = moment(obj['transfer_from_date'], 'YYYY-MM-DD');
            let is_date_found = from_date.isSame(next_day_date, 'date');

            if (is_date_found) {

                employeeFingerprintCallbacks.push(async (callback) => {
                    const employee_number = obj['transfer_for_employee']['employment_details']['employee_number']

                    let fingerprintData = await EmployeeFingerprint.getSpecificEmployeeFingerprint({ 'employee_number': employee_number });
                    fingerprintData = fingerprintData[0];
                    const tempObj = {

                        employee_number: fingerprintData['employee_number'],
                        fingerprints: fingerprintData['fingerprint_data']
                    }

                    callback(null, tempObj);
                });
            }
        });
        async.parallel(employeeFingerprintCallbacks, (err, employeeFingerprintData) => {

            let fingerprintData = [];
            for (let i = 0; i < employeeFingerprintData.length; i++) {
                fingerprintData.push(employeeFingerprintData[i]);
            }
            generateResponse(true, "Fetched All Employee Transfer Fingerprints", fingerprintData, res);
        });
    });
}

/* General Functions */
export async function getLastTransferDate(employeeDetails) {

    /*   console.log('Check', employeeDetails); */

    let transfers = employeeDetails['transfer_logs'];
    let joining_date = new Date(employeeDetails['employment_details']['joining_date']);

    /*  console.log('Check for date', joining_date); */

    if (transfers.length > 1) {

        /* console.log('Check IF'); */
        let previous_transfer_id = transfers[transfers.length - 2];
        let previous_transfer_details = await TransferRequest.getSpecificTransferRequest({ _id: previous_transfer_id });
        previous_transfer_details = previous_transfer_details[0];
        return previous_transfer_details['transfer_from_date'];
    }
    else {
        /* console.log('Check ELSE'); */
        return joining_date;

    }
}