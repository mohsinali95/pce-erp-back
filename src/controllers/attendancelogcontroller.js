'use strict';
import { parseBody, generateResponse, enumerateDaysBetweenDates, numberPadding, } from '../utilites';
import EmployeeAttendanceLog from '../models/employeeattendancelog';
import Employee from '../models/employee';
import EmployeeAttendance from '../models/employeeattendance';
import _ from 'lodash';
import moment from 'moment';
import { setAttendanceTypeZKTeco, calculateTotalServiceHours, calculateTotalExtraHours, calculateExtraHoursEmployeeShift, calculateServiceHours } from './timecalculationcontroller';
export async function addAttendanceLogData(req, res) {
try {
    let body = parseBody(req);
        //console.log(body);
        let logs = body['logs'];
        let from_date = new Date(body['from_date']);
        let to_date = new Date(body['to_date']);
        /* console.log(from_date, to_date);
        console.log("-------------------"); */
        /* Filtered Distinct Employees */
        let employees = [...new Set(logs.map(e => e.employeeNumber))];
        /* Logs ETL */
        logs = _.map(logs, (l) => {
        
            let dateTimeSplit = l['attendanceTime'].split(" ");
            let date = dateTimeSplit[0].split("-");
            let time = dateTimeSplit[1].split(":");
            let timeDate = new Date(Date.UTC(parseInt(date[0]), parseInt(date[1] - 1), parseInt(date[2]), parseInt(time[0]), parseInt(time[1]), parseInt(time[2])))
            const tempDate = l['attendanceTime']
            l['attendanceTime'] = timeDate;
            l['attendanceDate'] = moment(new Date(tempDate)).format('YYYY-MM-DD');
            return l;
        });
        console.log(logs);
        if (logs.length > 0) {
            let logsInsertion = await EmployeeAttendanceLog.createManyEmployeeAttendanceLog(logs);
        }
        for (let e of employees) {
            console.log(e)
            let iDate = new Date(from_date);
            let regexPattern = '';
            if (e < 10) {
                regexPattern = `PF-00${e}+$|pf-00${e}+$|pf00${e}+$|PF00${e}+$|00${e}+$`;
            } else if (e < 100) {
                regexPattern = `PF-0${e}+$|pf-0${e}+$|pf0${e}+$|PF0${e}+$|0${e}+$`;
            } else {
                regexPattern = `PF-${e}+$|pf-${e}+$|pf${e}+$|PF${e}+$|${e}+$`;
            }
            let employeeDetails = await Employee.getSpecificEmployeeV2({ 'employment_details.employee_number': { $regex: regexPattern } }, 'basic_details employment_details');
            if (employeeDetails.length > 0) {
                employeeDetails = employeeDetails[0];
                let employeeShiftTiming = employeeDetails['employment_details']['shift_timings'];
                let unitConfigDetails = employeeDetails['employment_details']['unit']['configuration'];
                let employeeAttendanceDetails = await EmployeeAttendance.getSpecificEmployeeAttendance({ 'employee_number': { $regex: regexPattern } });
                employeeAttendanceDetails = employeeAttendanceDetails[0];
                while (iDate <= to_date) {
                    /* Date and Month */
                    const attendanceDate = `${iDate.getFullYear()}-${parseInt(iDate.getMonth() + 1)}-${iDate.getDate()}`;
                    const attendanceMonth = iDate.getMonth();
                    console.log(attendanceDate, attendanceMonth);
                    let regexPattern = '';
                    if (e < 10) {
                        regexPattern = `PF-00${e}+$|pf-00${e}+$|pf00${e}+$|PF00${e}+$|00${e}+$`;
                    } else if (e < 100) {
                        regexPattern = `PF-0${e}+$|pf-0${e}+$|pf0${e}+$|PF0${e}+$|0${e}+$`;
                    } else {
                        regexPattern = `PF-${e}+$|pf-${e}+$|pf${e}+$|PF${e}+$|${e}+$`;
                    }
                    let minTimeQuery = {
                        attendanceDate: attendanceDate,
                        employeeNumber: e,
                        inOutMode: '0',
                        sort: 'attendanceTime',
                        sortby: 1,
                        limit: 1,
                        page: 1
                    };
                    
                    let maxTimeQuery = {
                        attendanceDate: attendanceDate,
                        employeeNumber: e,
                        inOutMode: '1',
                        sort: 'attendanceTime',
                        sortby: -1,
                        limit: 1,
                        page: 1
                    };
                    let timeIn = await EmployeeAttendanceLog.getEmployeeAttendanceLog(minTimeQuery);
                    let timeOut = await EmployeeAttendanceLog.getEmployeeAttendanceLog(maxTimeQuery);
                    let timeInObj = {};
                    let timeOutObj = {};
                    if (timeIn.length > 0) {
                        timeIn = timeIn[0];
                        timeInObj = {
                            hour: numberPadding(new Date(timeIn['attendanceTime']).getUTCHours()),
                            min: numberPadding(new Date(timeIn['attendanceTime']).getUTCMinutes())
                        }
                    }
                    else {
                        timeInObj = {
                            hour: '00',
                            min: '00'
                        }
                    }
                    if (timeOut.length > 0) {
                        timeOut = timeOut[0];
                        timeOutObj = {
                            hour: numberPadding(new Date(timeOut['attendanceTime']).getUTCHours()),
                            min: numberPadding(new Date(timeOut['attendanceTime']).getUTCMinutes())
                        }
                    }
                    else {
                        timeOutObj = {
                            hour: '00',
                            min: '00'
                        }

                    }
                    //console.log(timeInObj, timeOutObj);
                    /* Attendance Details Filtered Month */
                    let attendanceMonthFiltered = _.filter(employeeAttendanceDetails['attendance_details'], (obj) => {
                        return obj['month'] == attendanceMonth;
                    });
                    attendanceMonthFiltered = attendanceMonthFiltered[0];
                    let tempPreviousAttendanceObj = {};
                    let attendanceType = ""
                    // if(Array.isArray(employeeShiftTiming)){
                        if(typeof employeeShiftTiming != "undefined"){
                            attendanceType = setAttendanceTypeZKTeco(timeInObj, timeOutObj, unitConfigDetails, attendanceDate, employeeShiftTiming)
                        }
                    // }

                    let extraHoursPerDay = '00:00';
                    let serviceHoursPerDay = '00:00';
                    let TotalExtraHours = attendanceMonthFiltered['total_extra_hours'];
                    let TotalServiceHours = attendanceMonthFiltered['total_service_hours'];
                    if (attendanceType == 'Present' || attendanceType == 'Late') {
                        extraHoursPerDay = calculateExtraHoursEmployeeShift(unitConfigDetails, timeInObj, timeOutObj, attendanceDate, employeeShiftTiming);
                        serviceHoursPerDay = calculateServiceHours(timeInObj, timeOutObj);
                    }
                    let updateAttendanceDay = {
                        attendance_type: attendanceType,
                        attendance_date: attendanceDate,
                        remarks: '',
                        service_hours: serviceHoursPerDay,
                        extra_hours: extraHoursPerDay,
                        time_in: timeInObj,
                        time_out: timeOutObj
                    };
                    attendanceMonthFiltered['attendances'] = _.map(attendanceMonthFiltered['attendances'], (attendanceDayObj) => {
                        if (attendanceDayObj['attendance_date'] == attendanceDate) {
                            /* Saving Old Attendance Object Temporary  */
                            tempPreviousAttendanceObj = attendanceDayObj;
                            attendanceDayObj = updateAttendanceDay
                            console.log(attendanceDayObj);
                            return attendanceDayObj
                        }
                        else {
                            return attendanceDayObj
                        }
                    });
                    if (attendanceType == 'Present' || attendanceType == 'Late') {
                        TotalExtraHours = calculateTotalExtraHours(extraHoursPerDay, attendanceMonthFiltered['total_extra_hours'], tempPreviousAttendanceObj['extra_hours']);
                        TotalServiceHours = calculateTotalServiceHours(serviceHoursPerDay, attendanceMonthFiltered['total_service_hours'], tempPreviousAttendanceObj['service_hours'])
                    }
                    let updateObj = {
                        "$set": {
                            'attendance_details.$.total_extra_hours': TotalExtraHours,
                            'attendance_details.$.total_service_hours': TotalServiceHours,
                            'attendance_details.$.leaves_history': [],
                            'attendance_details.$.attendances': attendanceMonthFiltered['attendances']
                        }
                    };
                    let updateParams = { 'employee_number': { $regex: regexPattern }, 'attendance_details._id': attendanceMonthFiltered['_id'] };
                    let updated = await EmployeeAttendance.updateEmployeeAttendance(updateParams, updateObj);
                    console.log(updated);
                    /* Changing Date in loop */
                    let nextDate = iDate.setDate(iDate.getDate() + 1);
                    iDate = new Date(nextDate);
                }
            }
            console.log('---------------');
        }
        generateResponse(true, "Data migrated successfully", null, res);
    }
    catch (e) {
        console.log(e);
        generateResponse(false, "unable to create attendance log", null, res);
    }
}

export async function getAttendanceLog(req, res) {
    try {
        let queryParams = {
            attendanceDate: req.query.date,
            inOutMode: req.query.mode,
            employeeNumber: req.query.employee
        }
        /* let logs = await EmployeeAttendanceLog.getEmployeeAttendanceLog(queryParams).distinct("attendanceTime");
        */
        let dateSplit = req.query.date.split('-');
        console.log(dateSplit);
        let logs = await EmployeeAttendanceLog.aggregate([
            {
                $match: {
                    'attendanceDate': { "$gte": new Date(dateSplit[0], parseInt(dateSplit[1] - 1), parseInt(dateSplit[2]), 0, 0, 0), "$lt": new Date(dateSplit[0], parseInt(dateSplit[1] - 1), parseInt(dateSplit[2]), 11, 59, 59) },
                    'inOutMode': req.query.mode,
                    'employeeNumber': req.query.employee
                }
            },
            {
                $group: {
                    "_id": "$attendanceTime"
                }
            },
            {
                $project: { _id: 0, attendanceTime: "$_id", attendanceDate: 1, inOutMode: 1, employeeNumber: 1 }
            }
        ]);
        if (logs.length > 0) {
            logs = _.map(logs, (l) => {
                const time = {
                    hour: new Date(l['attendanceTime']).getUTCHours(),
                    min: new Date(l['attendanceTime']).getUTCMinutes()
                }
                l['time'] = time;
                return l;
            });
        }
        generateResponse(true, "logs fetched successfully", logs, res);
    }
    catch (e) {
        console.log(e);
        generateResponse(false, "unable to fetch attendance log", null, res);
    }
}