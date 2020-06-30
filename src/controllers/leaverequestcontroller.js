import { parseBody, generateResponse, getDaysInBetweenLeaveRequests, enumerateDaysBetweenDates } from '../utilites';
import { decryptValue } from '../utilites/encryption-module';
import { REQUEST_TYPE, LEAVE_REQUEST_STATUS, ATTENDANCE_TYPES, SYSTEM_EMPLOYEES } from '../utilites/constants';
import { initiatePriorityIndex } from './requestprocesscontroller';
import LeaveRequest from '../models/leaverequest';
import Department from '../models/department';
import Employee from '../models/employee';
import EmployeeAttendance from '../models/employeeattendance';
import _ from 'lodash';
import async from 'async';
import moment from 'moment';

/* REQUEST TYPE -> 1 = Leave Request */

export function generateLeaveRequest(req, res) {
    let body = parseBody(req);

    console.log(body);
    let createRequest = {};

    Department.getSpecificDepartment({ _id: body['department'] }, (err, departmentDetails) => {

        departmentDetails = departmentDetails[0];
        /* console.log(departmentDetails['requestline']); */

        let leaveRequestReportline = departmentDetails['requestline'].find(o => o.request_type === REQUEST_TYPE[1]);

        if (leaveRequestReportline.priority_order.length == 0) {
            generateResponse(false, "Sorry No Manager Exist in Leave Reportline", null, res);
        }
        else {

            let priority_index = initiatePriorityIndex(leaveRequestReportline.priority_order);
            console.log('Assign to: ', priority_index);

            let start = moment(body['from'], "YYYY-MM-DD");
            let end = moment(body['to'], "YYYY-MM-DD");

            let days = moment.duration(end.diff(start)).asDays();
            days = days + 1;

            console.log('Days', days);

            let employeeLeaveFindParams = { _id: body['employee'], leave_details: { $elemMatch: { name: body['leave_type'] } } };


            Employee.getSpecificEmployee(employeeLeaveFindParams, (err, employeeData) => {

                /*  console.log(employeeData); */

                if (employeeData.length > 0) {

                    const employee = employeeData[0];
                    //console.log('E', employee);
                    let leaveTypeDetails = employee.leave_details.find(o => o.name === body['leave_type']);
                    let remaining_leaves = leaveTypeDetails['total'] - leaveTypeDetails['used'];


                    let fromdate = new Date(body['from']);
                    let todate = new Date(body['to']);
                    let datesList = enumerateDaysBetweenDates(fromdate, todate);

                    console.log(datesList);
                    /* console.log(remaining_leaves, days); */
                    if (remaining_leaves >= days) {

                        let leaves_summary = getLeavesSummaryOfEmployee(employee.leave_details, body['leave_type'], days)
                        console.log(leaves_summary);

                        LeaveRequest.getLeaveRequests({ employee: body['employee'], from: fromdate, to: todate }, (err, requests) => {
                            console.log('E', requests.length);

                            if (requests.length > 0) {
                                generateResponse(false, "you have already pending requests", null, res);
                            }
                            else {
                                createRequest['leave_type'] = body['leave_type'];
                                createRequest['from'] = body['from'];
                                createRequest['to'] = body['to'];
                                createRequest['between_dates'] = datesList
                                createRequest['days'] = days
                                createRequest['reason'] = body['reason'];
                                createRequest['generated_by'] = req.payload._id;
                                createRequest['employee'] = body['employee'];
                                createRequest['leaves_summary'] = leaves_summary
                                createRequest['department'] = body['department'];
                                createRequest['request_next_order'] = priority_index;
                                createRequest['replacement_employee'] = null;
                                /* generateResponse(true, "Successfully Created Leave Request", createRequest, res); */
                                LeaveRequest.addLeaveRequest(createRequest, function (err, result) {
                                    if (err) {
                                        console.log(err);
                                        generateResponse(false, "Unable to Create Leave Request", null, res);
                                    }
                                    generateResponse(true, "Successfully Created Leave Request", result, res);
                                });
                            }
                        });
                    }
                    else {
                        generateResponse(false, `Sorry! You have only ${remaining_leaves} leaves left`, null, res);
                    }
                }
                else {
                    generateResponse(true, `Sorry!, You don't have any ${body['leave_type']} leaves`, null, res);
                }
            });

        }
    });
}

export function countLeaveRequests(req, res) {

    let body = parseBody(req);

    let query = {
        request_status: body.request_status
    };

    console.log(query);

    LeaveRequest.countLeaveRequests(query, (err, count) => {
        if (err) {
            console.log(err);
            generateResponse(false, "Unable to Count Leave Requests", null, res);
        }
        generateResponse(true, "Successfully Counted Leave Requests", count, res);

    });

}

export function getLeaveRequests(req, res) {

    let queryParams = {
        page: req.query.page || 1,
        limit: req.query.limit || 10,
        sort: req.query.sort,
        sortby: req.query.sortby,
        request_status: req.query.request_status,
        /*  employee : req.query.employee */
    };

    if (queryParams['request_status']) {
        queryParams['request_status'] = queryParams['request_status'].split(",").map(i => parseInt(i, 10));
    }
    else {

        queryParams['request_status'] = _.values(LEAVE_REQUEST_STATUS);
    }

    LeaveRequest.getLeaveRequests(queryParams, (err, leaverequests) => {
        if (err) {
            console.log(err);
            generateResponse(false, "Unable to Fetch Requests", null, res);
        }
        let getDepReportlinetFunctions = [];
        leaverequests.forEach(element => {
            /* console.log('Ele', element); */
            /* const deptId = element['employee']['employment_details']['department']['_id']; */
            const deptId = element['department']['_id'];
            getDepReportlinetFunctions.push((callback) => {

                Department.getSpecificDepartment({ _id: deptId }, (err, deptDetail) => {

                    if (err) return callback(err);
                    let leaveRequestReportingline = deptDetail[0]['requestline'].find(o => o.request_type === REQUEST_TYPE[1]);
                    callback(null, leaveRequestReportingline['priority_order']);

                });
            });

        });

        async.parallel(getDepReportlinetFunctions, (err, reportline) => {

            for (let i = 0; i < leaverequests.length; i++) {
                leaverequests[i]['requestline'] = reportline[i];
            }
            LeaveRequest.countLeaveRequests(queryParams, function (err, count) {

                if (count != 0) {
                    let data = {
                        data: leaverequests,
                        current: queryParams.page,
                        pages: Math.ceil(count / queryParams.limit),
                        totalrecords: count
                    }
                    generateResponse(true, "Fetch Leave Requests", data, res);
                }
                else {

                    let data = {
                        data: leaverequests,
                        current: queryParams.page,
                        pages: queryParams.page,
                        totalrecords: count
                    }
                    generateResponse(true, "Fetch Leave Requests", data, res);
                }
            });
        });
    });
}

export async function getLeaveRequestsV2(req, res) {

    try {

        let queryParams = {
            page: req.query.page || 1,
            limit: req.query.limit || 10,
            sort: req.query.sort,
            sortby: req.query.sortby,
            request_status: req.query.request_status,
            search: req.query.search || ''

        };

        let userPayload = req.payload;

        if (queryParams['request_status']) {
            queryParams['request_status'] = queryParams['request_status'].split(",").map(i => parseInt(i, 10));
        }
        else {

            queryParams['request_status'] = _.values(LEAVE_REQUEST_STATUS);

        }


        let pipeline = [
            {
                $lookup: {
                    "from": 'employees',
                    "localField": "employee",
                    "foreignField": "_id",
                    "as": "employee"
                }
            },
            {
                $lookup: {
                    "from": 'employees',
                    "localField": "generated_by",
                    "foreignField": "_id",
                    "as": "generated_by"
                }
            },
            {
                $lookup: {
                    "from": 'departments',
                    "localField": "department",
                    "foreignField": "_id",
                    "as": "department"
                }
            },
            { $unwind: "$employee" },
            { $unwind: "$employee.employment_details" },
            { $unwind: "$generated_by" },
            { $unwind: "$department" },
            {
                $lookup: {
                    "from": 'units',
                    "localField": "department.unit_id",
                    "foreignField": "_id",
                    "as": "department.unit_id"
                }
            },
            { $unwind: "$department.unit_id" },
            {
                $lookup: {
                    "from": 'departments',
                    "localField": "employee.employment_details.department",
                    "foreignField": "_id",
                    "as": "employee.employment_details.department"
                }
            },
            { $unwind: "$employee.employment_details.department" },
            { $unwind: "$status_log" },
            {
                $lookup: {
                    "from": 'employees',
                    "localField": "status_log.action_by",
                    "foreignField": "_id",
                    "as": "status_log.action_by"
                }
            },
            { $unwind: "$status_log.action_by" },
            {
                $match: {
                    $or: [
                        { 'employee.basic_details.firstname': { $regex: queryParams.search, $options: 'i' } },
                        { 'employee.basic_details.lastname': { $regex: queryParams.search, $options: 'i' } },
                        { 'employee.employment_details.employee_number': { $regex: queryParams.search, $options: 'i' } },

                    ],
                    'request_status': { $in: queryParams['request_status'] },
                
                }
            }
            

        ];


        let leaverequests = await LeaveRequest.aggregate(pipeline);

        let getDepReportlinetFunctions = [];
        leaverequests.forEach(element => {
           
            const deptId = element['department']['_id'];
            getDepReportlinetFunctions.push((callback) => {

                Department.getSpecificDepartment({ _id: deptId }, (err, deptDetail) => {

                    if (err) return callback(err);
                    let leaveRequestReportingline = deptDetail[0]['requestline'].find(o => o.request_type === REQUEST_TYPE[1]);
                    callback(null, leaveRequestReportingline['priority_order']);

                });
            });

        });

        async.parallel(getDepReportlinetFunctions, (err, reportline) => {

            let filteredLeaveRequests = [];


            for (let i = 0; i < leaverequests.length; i++) {

                leaverequests[i]['requestline'] = reportline[i];

                for (let j = 0; j < leaverequests[i]['requestline'].length; j++) {
                    const element = leaverequests[i]['requestline'][j];

                    console.log(element['department']['_id'], userPayload['department'])

                    if(element['department']['_id'].toString() === userPayload['department'] || SYSTEM_EMPLOYEES.includes(userPayload['employee_number'])){

                        filteredLeaveRequests.push(leaverequests[i])

                    }
                }


                console.log(leaverequests[i]['requestline']);
            }
            generateResponse(true, "Fetch Leave Requests", filteredLeaveRequests, res);
           
        });

        /* */
    }
    catch (e) {
        console.log(e);
        generateResponse(false, "Unable to Fetch Requests", null, res);

    }


}

export function deleteLeaveRequests(req, res) {

    let leaveRequestId = req.query.id;
    let queryParam = {
        _id: leaveRequestId
    };
    LeaveRequest.deleteLeaveRequest(queryParam, (err, update) => {

        console.log(update);
        if (err) {
            generateResponse(false, 'Unable to delete Leave Requests', null, res);
        }
        generateResponse(true, 'Leave Requests Deleted Successfully', null, res);

    });

}

export async function updateStatusLeaveRequest(req, res) {

    let body = parseBody(req);
    let userPayload = req.payload;
    let request_id = req.query['request_id'];
    console.log(request_id);
    let updateParam = {
        '_id': request_id
    };

    console.log('Body', body);
    try {
        let response = await LeaveRequest.getSpecificLeaveRequest({ '_id': request_id });
        const requestDetails = response[0];
        console.log(requestDetails)
        let status_log = requestDetails['status_log'];
        console.log(requestDetails['employee']['employment_details']['department']);
        Department.getSpecificDepartment({ _id: requestDetails['employee']['employment_details']['department'] }, (err, department) => {

            let leaveRequestReportline = department[0]['requestline'].find(o => o.request_type === REQUEST_TYPE[1]);
            let priority_order_array = leaveRequestReportline['priority_order'];
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

                if (requestDetails['request_status'] == LEAVE_REQUEST_STATUS['pending']) {

                    if (body['request_status'] == LEAVE_REQUEST_STATUS['approved']) {

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

                                let leaveFromDate = new Date(requestDetails['from']);

                                if (leaveFromDate >= new Date()) {


                                    Employee.updateEmployee({ _id: requestDetails['employee']['_id'], "leave_details.name": requestDetails['leave_type'] }, { "$inc": { "leave_details.$.used": requestDetails['days'] } }, (err, response) => {

                                        if (err) {
                                            generateResponse(true, "Unable to Update", err.message, res);
                                        }
                                        LeaveRequest.updateLeaveRequest(updateParam, updateData, (err, response) => {

                                            if (err) {
                                                console.log(err);
                                                generateResponse(false, "Unable to Update Leave Request", null, res);
                                            }

                                            let is_approved_check = {

                                                is_approved: true

                                            };

                                            generateResponse(true, "Successfully Updated Leave Requests", is_approved_check, res);
                                        });

                                    });

                                }
                                else {


                                    Employee.updateEmployee({ _id: requestDetails['employee']['_id'], "leave_details.name": requestDetails['leave_type'] }, { "$inc": { "leave_details.$.used": requestDetails['days'] } }, (err, response) => {

                                        if (err) {
                                            generateResponse(true, "Unable to Update", err.message, res);
                                        }
                                        LeaveRequest.updateLeaveRequest(updateParam, updateData, async (err, response) => {

                                            if (err) {
                                                console.log(err);
                                                generateResponse(false, "Unable to Update Leave Request", null, res);
                                            }

                                            let is_approved_check = {

                                                is_approved: true

                                            };
                                            await setLeavesOnEmployeeAttendance(requestDetails['employee']['employment_details']['employee_number'], requestDetails['between_dates'])
                                            generateResponse(true, "Successfully Updated Leave Requests", is_approved_check, res);
                                        });

                                    });


                                }
                            }
                            else {
                                updateData = {
                                    'request_status': LEAVE_REQUEST_STATUS['pending'],
                                    'request_next_order': request_next_order,
                                    'replacement_employee': body['replacement_employee'],
                                    $push: {
                                        'status_log': {
                                            'status': LEAVE_REQUEST_STATUS['pending'],
                                            'action_by': userPayload['_id'],
                                            'updated_at': new Date
                                        }
                                    }
                                };



                                /*  updateData['replacement_employee'] = body['replacement_employee']; */

                                LeaveRequest.updateLeaveRequest(updateParam, updateData, (err, response) => {

                                    if (err) {
                                        console.log(err);
                                        generateResponse(false, "Unable to Update Leave Request", null, res);
                                    }

                                    let is_approved_check = {

                                        is_approved: false

                                    };
                                    generateResponse(true, "Successfully Updated Leave Requests", is_approved_check, res);
                                });

                            }
                        }
                    }
                    else if (body['request_status'] == LEAVE_REQUEST_STATUS['rejected']) {

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

                            LeaveRequest.updateLeaveRequest(updateParam, updateData, (err, response) => {

                                if (err) {
                                    console.log(err);
                                    generateResponse(false, "Unable to Update Leave Request", null, res);
                                }
                                generateResponse(true, "Successfully Updated Leave Requests", response, res);
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

        });
    }
    catch (e) {


        console.log(e);
        generateResponse(false, "Unable to Update Leave Request", null, res);


    }
}

export async function getSpecificLeaveRequest(req, res) {

    let leaveRequestId = req.params['leaverequestid'];

    try {
        let leaveRequestData = await LeaveRequest.getSpecificLeaveRequest({ _id: leaveRequestId });
        generateResponse(true, "Leave request fetched successfully", leaveRequestData, res);
    }
    catch (e) {

        console.log(e);
        generateResponse(false, "Unable to fetch Leave Request", null, res);
    }

}


export async function getLeaveRequestPrint(req, res) {

    let leaveRequestId = req.params['leaverequestid'];

    try {

        let leaveRequestData = await LeaveRequest.getSpecificLeaveRequest({ _id: leaveRequestId });
        leaveRequestData = leaveRequestData[0]
        let created_date = new Date(leaveRequestData['timestamps']['created_at']);
        created_date = `${created_date.getFullYear()}-${created_date.getMonth() + 1}-${created_date.getDate()}`;
        let from_date = new Date(leaveRequestData['from']);
        from_date = `${from_date.getFullYear()}-${from_date.getMonth() + 1}-${from_date.getDate()}`;
        let to_date = new Date(leaveRequestData['to']);
        to_date = `${to_date.getFullYear()}-${to_date.getMonth() + 1}-${to_date.getDate()}`;

        leaveRequestData['status_log'] = _.map(leaveRequestData['status_log'], (obj, index) => {

            let temp_date = new Date(obj['action_by']['timestamps']['updated_at']);
            temp_date = `${temp_date.getFullYear()}-${temp_date.getMonth() + 1}-${temp_date.getDate()}`;
            obj['action_by']['timestamps']['updated_at'] = temp_date
            return obj;
        });

        let leave_data = {

            employee_number: leaveRequestData['employee']['employment_details']['employee_number'],
            employee_firstname: leaveRequestData['employee']['basic_details']['firstname'],
            employee_lastname: leaveRequestData['employee']['basic_details']['lastname'],
            employee_designation: leaveRequestData['employee']['employment_details']['designation'],
            employee_unit: leaveRequestData['employee']['employment_details']['unit']['name'],
            employee_department: leaveRequestData['employee']['employment_details']['department']['name'],
            date_of_creation: created_date,
            leave_from: from_date,
            leave_to: to_date,
            leave_days: leaveRequestData['days'],
            leave_type: leaveRequestData['leave_type'],
            leave_reason: leaveRequestData['reason'],
            leave_records: [],
            approvals: leaveRequestData['status_log']
        };


        for (let i = 0; i < leaveRequestData['leaves_summary'].length; i++) {
            const element = leaveRequestData['leaves_summary'][i]

            console.log(element['leave_type'], leave_data['leave_type'])

            if (element['leave_type'] == leave_data['leave_type']) {

                let temp_obj = {

                    name: element['leave_type'],
                    total_leaves: element['current_balance'],
                    On_this_form: leaveRequestData['days'],
                    remaining_balance: element['remaining_balance']
                };


                leave_data['leave_records'].push(temp_obj);
            }
            else {

                let temp_obj = {


                    name: element['leave_type'],
                    total_leaves: element['current_balance'],
                    On_this_form: 0,
                    remaining_balance: element['remaining_balance']
                }

                leave_data['leave_records'].push(temp_obj)

            }
        }


        /* for (let i = 0; i < leave_data['leave_records'].length; i++) {
            const element = leave_data['leave_records'][i]   
            if (element['name'] == leave_data['leave_type']) {
                let remaining_balance = leave_data['leave_records'][i]['total'] - leave_data['leave_records'][i]['used'];
                let previous_balance = remaining_balance + leave_data['leave_days']
                leave_data['leave_records'][i]['previous_balance'] = previous_balance,
                leave_data['leave_records'][i]['On_this_form'] = leave_data['leave_days']
                leave_data['leave_records'][i]['remaining_balance'] = remaining_balance
            }
            else{
                let remaining_balance = leave_data['leave_records'][i]['total'] - leave_data['leave_records'][i]['used'];
                let previous_balance = remaining_balance - 0
                leave_data['leave_records'][i]['previous_balance'] = previous_balance,
                leave_data['leave_records'][i]['On_this_form'] = 0
                leave_data['leave_records'][i]['remaining_balance'] = remaining_balance
            }
        } */


        console.log(leave_data);

        generateResponse(true, "Leave request fetched successfully", leave_data, res);

    }
    catch (e) {

        console.log(e);
        generateResponse(false, "Unable to fetch Leave Request", null, res);
    }

}


/* General Functions */

export function getLeavesSummaryOfEmployee(employeeLeaveDetails, leave_type, leave_days) {




    let leave_summary = [];


    for (let i = 0; i < employeeLeaveDetails.length; i++) {
        const element = employeeLeaveDetails[i]

        if (element['name'] == leave_type) {


            let current_balance = element['total'] - element['used']
            let remaining_balance = leave_days + element['used'];
            remaining_balance = element['total'] - remaining_balance;

            let temp_obj = {

                leave_type: element['name'],
                current_balance: current_balance,
                remaining_balance: remaining_balance
            }


            leave_summary.push(temp_obj)

        }
        else {

            let current_balance = element['total'] - element['used']
            let remaining_balance = 0 + element['used'];
            remaining_balance = element['total'] - remaining_balance;

            let temp_obj = {

                leave_type: element['name'],
                current_balance: current_balance,
                remaining_balance: remaining_balance
            }

            leave_summary.push(temp_obj)

        }
    }

    return leave_summary

}

export async function setLeavesOnEmployeeAttendance(employee_number, leave_days) {


    //console.log(employee_number, leave_days);

    let employeeAttendanceDetails = await EmployeeAttendance.getSpecificEmployeeAttendance({ 'employee_number': employee_number })
    employeeAttendanceDetails = employeeAttendanceDetails[0];
    //console.log(employeeAttendanceDetails);

    leave_days.forEach(async (l) => {

        const date = new Date(l);
        const attendanceMonth = date.getMonth();
        const attendance_date = `${date.getFullYear()}-${parseInt(date.getMonth()) + 1}-${date.getDate()}`

        let attendanceDetailMonth = _.filter(employeeAttendanceDetails['attendance_details'], (attendance_month) => {

            return attendance_month['month'] == attendanceMonth

        });
        attendanceDetailMonth = attendanceDetailMonth[0];

        let attendances = _.map(attendanceDetailMonth['attendances'], (attendance) => {

            if (attendance['attendance_date'] == attendance_date) {

                attendance['attendance_type'] = ATTENDANCE_TYPES[3]
            }
            return attendance;
        });


        let updateParams = { 'employee_number': employee_number, 'attendance_details._id': attendanceDetailMonth['_id'] };
        let updateObj = {

            "$set": {
                'attendance_details.$.attendances': attendances
            }
        };
        let update = await EmployeeAttendance.updateEmployeeAttendance(updateParams, updateObj);
    });
}


