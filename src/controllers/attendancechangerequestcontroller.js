import { parseBody, generateResponse } from '../utilites';
/* import { decryptValue } from '../utilites/encryption-module'; */
import { ATTENDANCE_CHANGE_REQUEST } from '../utilites/constants';
import AttendanceChangeRequest from '../models/attendance_change_request';
import { calculateTotalServiceHours, calculateTotalExtraHours, calculateExtraHours, calculateServiceHours } from './timecalculationcontroller';
import Employee from '../models/employee';
import EmployeeAttendance from '../models/employeeattendance';
import _ from 'lodash';

export async function generateAttendanceChangeRequest(req, res) {

    let body = parseBody(req);
    let user_payload = req.payload;
    const attendanceMonthId = body['attendance_month_id'];

    let employee = await Employee.getSpecificEmployeeV2({ 'employment_details.employee_number': body['employee_number'] });
    let employeeAttendanceDetails = await EmployeeAttendance.getSpecificEmployeeAttendance({ 'employee_number': body['employee_number'] });
    employee = employee[0];
    employeeAttendanceDetails = employeeAttendanceDetails[0];

    let request = await AttendanceChangeRequest.getSpecificAttendanceChangeRequest({ 'change_in_employee': employee['_id'], 'attendance_date': body['attendance_date'], 'request_status': [0] });
    console.log(request);

    if (request.length > 0) {
        generateResponse(false, `Request Already Pending of Date: ${body['attendance_date']}`, null, res);
    }
    else {
        const unitConfigDetails = employee['employment_details']['unit']['configuration'];
        let deptDetails = employee['employment_details']['department'];

        console.log(deptDetails);

        if (deptDetails['manager'] == null) {

            generateResponse(false, 'No Manager Exist in Department', null, res);

        }
        else {
            let extraHoursPerDay = calculateExtraHours(unitConfigDetails, body['change_request_time']['time_in'], body['change_request_time']['time_out'], body['attendance_date']);
            let serviceHoursPerDay = calculateServiceHours(body['change_request_time']['time_in'], body['change_request_time']['time_out']);


            let currentMonth = employeeAttendanceDetails['attendance_details'].filter((attendanceMonth) => {
                return attendanceMonthId == attendanceMonth['_id'];
            });
            let currentDateTimeInTimeOut;

            currentMonth[0]['attendances'].forEach((element, index) => {
                if (element['attendance_date'] == body['attendance_date']) {
                    currentDateTimeInTimeOut = currentMonth[0]['attendances'][index];
                }
            });
            let request_change = {
                generated_by: user_payload['_id'],
                change_in_employee: employee['_id'],
                department: employee['employment_details']['department']['_id'],
                attendance_for: {
                    month: currentMonth[0]['month'],
                    year: currentMonth[0]['year']
                },
                attendance_date: body['attendance_date'],
                attendance_type: body['attendance_type'],
                change_request_time: {
                    time_in: {
                        hour: body['change_request_time']['time_in']['hour'],
                        min: body['change_request_time']['time_in']['min']
                    },
                    time_out: {
                        hour: body['change_request_time']['time_out']['hour'],
                        min: body['change_request_time']['time_out']['min']
                    },
                    service_hours: serviceHoursPerDay,
                    extra_hours: extraHoursPerDay
                },
                current_time: {
                    time_in: {
                        hour: currentDateTimeInTimeOut['time_in']['hour'],
                        min: currentDateTimeInTimeOut['time_in']['min']
                    },
                    time_out: {
                        hour: currentDateTimeInTimeOut['time_out']['hour'],
                        min: currentDateTimeInTimeOut['time_out']['min']
                    },
                    service_hours: currentDateTimeInTimeOut['service_hours'],
                    extra_hours: currentDateTimeInTimeOut['extra_hours']
                }

            };
            AttendanceChangeRequest.createAttendanceChangeRequest(request_change, (err, request) => {
                if (err) {
                    generateResponse(false, 'Unable to generate Attendance Request', null, res);
                }
                generateResponse(true, 'Attendance Change Request Generated', request, res);

            });

        }

    }
}

export async function getAllAttendanceChangeRequests(req, res) {

    let queryParams = {
        page: req.query.page || 1,
        limit: req.query.limit || 10,
        sort: req.query.sort,
        sortby: req.query.sortby,
        request_status: req.query.request_status,
        employee: req.query.employee
    };

    let data;

    if (queryParams['request_status']) {
        queryParams['request_status'] = queryParams['request_status'].split(",");
    }

    let changeRequests = await AttendanceChangeRequest.getAttendanceChangeRequests(queryParams);
    let countRequests = await AttendanceChangeRequest.countAttendanceChangeRequests(queryParams);

    if (countRequests != 0) {
        data = {
            data: changeRequests,
            current: queryParams.page,
            pages: Math.ceil(countRequests / queryParams.limit),
            totalrecords: countRequests
        };
    }
    else {

        data = {
            data: changeRequests,
            current: queryParams.page,
            pages: queryParams.page,
            totalrecords: countRequests
        };

    }
    generateResponse(true, "Fetch Leave Requests", data, res);
}

export async function updateAttendanceRequest(req, res) {

    let body = parseBody(req);
    let user_payload = req.payload;
    let updateAttendanceStatus = {};

    let request = await AttendanceChangeRequest.getSpecificAttendanceChangeRequest({ '_id': body['request_id'] });
    request = request[0];
    let employee = await Employee.getSpecificEmployeeV2({ '_id': request['change_in_employee'] });
    employee = employee[0];
    let employeeAttendanceDetails = await EmployeeAttendance.getSpecificEmployeeAttendance({ 'employee_number': employee['employment_details']['employee_number'] })
    employeeAttendanceDetails = employeeAttendanceDetails[0];
    if (request['department']['manager'] == user_payload['_id']) {

        if (request['request_status'] == ATTENDANCE_CHANGE_REQUEST['pending']) {

            if (ATTENDANCE_CHANGE_REQUEST['approved'] == body['request_status']) {

                /* On Approving Request Status will be => 1 */

                let newAttendanceObj = {
                    time_in: {
                        hour: request['change_request_time']['time_in']['hour'],
                        min: request['change_request_time']['time_in']['min']
                    },
                    time_out: {
                        hour: request['change_request_time']['time_out']['hour'],
                        min: request['change_request_time']['time_out']['min']
                    },
                    service_hours: request['change_request_time']['service_hours'],
                    extra_hours: request['change_request_time']['extra_hours'],
                    attendance_type: body['attendance_type'],
                    remarks: body['remarks']
                };
                let currentMonth = employeeAttendanceDetails['attendance_details'].filter((attendanceMonth) => {
                    return request['attendance_for']['month'] == attendanceMonth['month'] && request['attendance_for']['year'] == attendanceMonth['year'];
                });
                currentMonth[0]['attendances'].forEach((element, index) => {
                    if (element['attendance_date'] == request['attendance_date']) {

                        newAttendanceObj = Object.assign(currentMonth[0]['attendances'][index], newAttendanceObj);
                        currentMonth[0]['attendances'][index] = newAttendanceObj
                        console.log('Final', currentMonth[0]['attendances'][index]);
                    }
                });
                let attendance_month_id = currentMonth[0]['_id'];

                let updateParams = { 'employee_number': employee['employment_details']['employee_number'], 'attendance_details._id': attendance_month_id };
                let updateObj = {
                    "$set": {
                        'attendance_details.$.total_extra_hours': calculateTotalExtraHours(newAttendanceObj['extra_hours'], currentMonth[0]['total_extra_hours'], request['current_time']['extra_hours']),
                        'attendance_details.$.total_service_hours': calculateTotalServiceHours(newAttendanceObj['service_hours'], currentMonth[0]['total_service_hours'], request['current_time']['service_hours']),
                        'attendance_details.$.leaves_history': [],
                        'attendance_details.$.attendances': currentMonth[0]['attendances']
                    }
                };

                /*  generateResponse(true, `Successfully Approved Attendance Change Request`, updateObj, res); */
                let update = await EmployeeAttendance.updateEmployeeAttendance(updateParams, updateObj);
                console.log('Test Update', update);
                updateAttendanceStatus['request_status'] = body['request_status'];
                updateAttendanceStatus['remarks'] = body['remarks'];
                AttendanceChangeRequest.updateAttendanceChangeRequest({ _id: body['request_id'] }, updateAttendanceStatus, (err, update) => {
                    if (err) {
                        console.log(err);
                        generateResponse(false, "Unable to Update", null, res)
                    }
                    generateResponse(true, `Successfully Approved Attendance Change Request`, update, res);
                });
                /*  Employee.updateEmployee(updateParams, updateObj, (err, update) => {
                     if (err) {
                         console.log(err);
                         generateResponse(false, "Unable to Update", null, res)
                     }
                   
                     updateAttendanceStatus['request_status'] = body['request_status'];
                     updateAttendanceStatus['remarks'] = body['remarks'];
                     AttendanceChangeRequest.updateAttendanceChangeRequest({_id : body['request_id']}, updateAttendanceStatus, (err, update)=> {
                         if (err) {
                             console.log(err);
                             generateResponse(false, "Unable to Update", null, res)
                         }
                         generateResponse(true, `Successfully Approved Attendance Change Request`, update, res);
                     });
                 }); */
            }
            else if (ATTENDANCE_CHANGE_REQUEST['rejected'] == body['request_status']) {

                /* On Rejecting Request Status will be => 2 */
                updateAttendanceStatus['request_status'] = body['request_status'];
                updateAttendanceStatus['remarks'] = body['remarks'];
                AttendanceChangeRequest.updateAttendanceChangeRequest({ _id: body['request_id'] }, updateAttendanceStatus, (err, update) => {
                    if (err) {
                        console.log(err);
                        generateResponse(false, "Unable to Update", null, res)
                    }
                    generateResponse(true, `Successfully Rejected Attendance Change Request`, update, res);
                });
            }
            else {
                generateResponse(false, "Sorry! Not a valid status", employee, res);
            }
        }
        else {
            generateResponse(false, "Request is not pending", null, res);
        }
    }
    else {
        generateResponse(false, "Unauthorized request", null, res);
    }
}