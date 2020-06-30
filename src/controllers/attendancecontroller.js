import { parseBody, generateResponse, createCurrentAttendanceMonthObj, getReportFilePath, getNextMonthYear, enumerateDaysBetweenDates } from '../utilites';
import { calculateTotalServiceHours, calculateTotalExtraHours, calculateExtraHours, calculateServiceHours, convertHourstoMinutes, convertMinutestoHours } from './timecalculationcontroller';
import { decryptValue } from '../utilites/encryption-module';
import { generateExcelReport } from '../utilites/report-generator-module';
import { REPORT_TYPES, ATTENDANCE_TYPES, SYSTEM_EMPLOYEES } from '../utilites/constants';
import Employee from '../models/employee';
import EmployeeAttendance from '../models/employeeattendance';
import * as _ from 'lodash';
import config from '../conf';
import async from 'async';
import moment from 'moment';
import fs from "fs"

export async function getEmployeeAttendance(req, res) {

    let queryParams = {
        page: req.query.page || 1,
        limit: req.query.limit || 10,
        /* Custom */
        department: req.query.department || null,
        unit: req.query.unit || null,
        month: req.query.month || new Date().getMonth().toString(),
        employee: req.query.employee || null,
        year: req.query.year || new Date().getFullYear().toString()
    };

    let selected_fields = 'basic_details employment_details';
    queryParams.unit = queryParams.unit == null ? null : [queryParams.unit];

    if (queryParams.employee) {

        try {

            let employee = await Employee.getSpecificEmployeeV2({ 'employment_details.employee_number': queryParams.employee }, selected_fields);
            let employee_attendance = await EmployeeAttendance.getSpecificEmployeeAttendance({ 'employee_number': queryParams.employee });

            if (employee_attendance.length > 0) {
                let attendance = employee_attendance[0]['attendance_details'];
                attendance = attendance.filter((obj) => {
                    return obj.month == queryParams.month && obj.year == queryParams.year
                });
                employee_attendance[0]['attendance_details'] = attendance;


                console.log(employee_attendance[0]['attendance_details']);


                let data = _.map(employee, (item, index) => {
                    let employee_data = {

                        _id: item['_id'],
                        basic_details: item['basic_details'],
                        employment_details: item['employment_details'],
                        employee_number: employee_attendance[index]['employee_number'],
                        attendance_details: employee_attendance[index]['attendance_details']
                    };
                    return employee_data;
                });
                generateResponse(true, "Fetch Employees Attendance", data, res);
            }
            else {


                let data = _.map(employee, (item, index) => {
                    let employee_data = {

                        _id: item['_id'],
                        basic_details: item['basic_details'],
                        employment_details: item['employment_details'],
                        employee_number: item['employment_details']['employee_number'],
                        attendance_details: []
                    };
                    return employee_data;
                });
                generateResponse(true, "Fetch Employees Attendance", data, res);
            }
        }
        catch (e) {

            console.log('Error: ', e);
            generateResponse(false, "Unable to Fetch Employees", null, res);
        }

    }
    else {

        try {

            let employees = await Employee.getEmployee(queryParams, selected_fields);

            let employeeAttendanceFunctions = [];

            employees.forEach(function (item, index) {

                let employee_number = item['employment_details']['employee_number']

                console.log(employee_number);
                employeeAttendanceFunctions.push(async (callback) => {
                    let employee_attendance = await EmployeeAttendance.getSpecificEmployeeAttendance({ 'employee_number': employee_number });


                    console.log('Check', employee_attendance)

                    if (employee_attendance.length > 0) {
                        let attendance = employee_attendance[0]['attendance_details'];
                        attendance = attendance.filter((attendanceObj) => {
                            return attendanceObj.month == queryParams.month && attendanceObj.year == queryParams.year;
                        });
                        employee_attendance[0]['attendance_details'] = attendance;

                        let temp_data = {

                            employee_number: employee_attendance[0]['employee_number'],
                            attendance_details: employee_attendance[0]['attendance_details']

                        }

                        callback(null, temp_data);

                    }
                    else {

                        let temp_data = {

                            employee_number: employee_number,
                            attendance_details: []
                        }
                        callback(null, temp_data);

                    }


                });
            });

            async.parallel(employeeAttendanceFunctions, async (err, attendances) => {

                let employees_data = _.map(employees, (obj, index) => {
                    let employee_data_temp = {

                        _id: obj['_id'],
                        basic_details: obj['basic_details'],
                        employment_details: obj['employment_details'],
                        employee_number: attendances[index]['employee_number'],
                        attendance_details: attendances[index]['attendance_details']
                    };
                    return employee_data_temp;
                })

                let employeesCount = await Employee.countEmployee(queryParams);

                if (employeesCount != 0) {
                    let data = {
                        employees: employees_data,
                        current: queryParams.page,
                        pages: Math.ceil(employeesCount / queryParams.limit),
                        totalrecords: employeesCount
                    }
                    generateResponse(true, "Fetch Employees", data, res);
                }
                else {

                    let data = {
                        employees: employees_data,
                        current: queryParams.page,
                        pages: queryParams.page,
                        totalrecords: employeesCount
                    }
                    generateResponse(true, "Fetch Employees", data, res);
                }

            });
        }
        catch (e) {

            console.log('Error: ', e);
            generateResponse(false, "Unable to Fetch Employees", data, res);
        }

    }

}

export async function addEmployeeAttendance(req, res) {

    try {

        let body = parseBody(req);
        let attendance_month_year_id = body['attendance_id'];
        let employee_number = body['employee_number'];

        let employee = await Employee.getSpecificEmployeeV2({ 'employment_details.employee_number': employee_number });
        let employee_attendance = await EmployeeAttendance.getSpecificEmployeeAttendance({ 'employee_number': employee_number });

        let unitConfigDetails = employee[0]['employment_details']['unit']['configuration'];

        let extraHoursPerDay = calculateExtraHours(unitConfigDetails, body['attendance']['time_in'], body['attendance']['time_out'], body['attendance']['attendance_date']);
        let serviceHoursPerDay = calculateServiceHours(body['attendance']['time_in'], body['attendance']['time_out']);

        let newAttendanceObj = {

            attendance_type: body['attendance']['attendance_type'],
            attendance_date: body['attendance']['attendance_date'],
            remarks: body['attendance']['remarks'],
            service_hours: serviceHoursPerDay,
            extra_hours: extraHoursPerDay,
            time_in: {
                hour: body['attendance']['time_in']['hour'],
                min: body['attendance']['time_in']['min']
            },
            time_out: {
                hour: body['attendance']['time_out']['hour'],
                min: body['attendance']['time_out']['min']
            }
        };
        let currentMonth = employee_attendance[0]['attendance_details'].filter((attendanceMonth) => {
            return attendance_month_year_id == attendanceMonth['_id'];
        });
        let datePreviousAttendanceDetails;

        currentMonth[0]['attendances'].forEach((element, index) => {
            if (element['attendance_date'] == body['attendance']['attendance_date']) {
                datePreviousAttendanceDetails = currentMonth[0]['attendances'][index]
                currentMonth[0]['attendances'][index] = newAttendanceObj;
            }
        });


        let updateParams = { 'employee_number': employee_number, 'attendance_details._id': attendance_month_year_id };
        let updateObj = {

            "$set": {
                'attendance_details.$.total_extra_hours': calculateTotalExtraHours(extraHoursPerDay, currentMonth[0]['total_extra_hours'], datePreviousAttendanceDetails['extra_hours']),
                'attendance_details.$.total_service_hours': calculateTotalServiceHours(serviceHoursPerDay, currentMonth[0]['total_service_hours'], datePreviousAttendanceDetails['service_hours']),
                'attendance_details.$.leaves_history': [],
                'attendance_details.$.attendances': currentMonth[0]['attendances']
            }
        };

        let update = await EmployeeAttendance.updateEmployeeAttendance(updateParams, updateObj);
        console.log(update);
        generateResponse(true, `Successfully Updated Attendance - Dated ${body['attendance']['attendance_date']}`, update, res);
    }
    catch (e) {
        console.log(e);
        generateResponse(false, "Unable to update Attendance", null, res);
    }
}

export async function createAttendanceMonthEmployee(req, res) {

    try {

        let body = parseBody(req);
        let month_details = createCurrentAttendanceMonthObj(parseInt(body['month'] - 1), body['year']);
        let updateObj = {
            $push: {
                'attendance_details': month_details
            }
        };

        let employees = await EmployeeAttendance.getEmployeeAttendance({});
        //console.log(employees.length);


        let filtered_employees = [];

        _.map(employees, (item) => {

            //console.log('emp', item['employee_number']);
            const attendance_details_array = item['attendance_details']

            for (let i = 0; i < attendance_details_array.length; i++) {
                const obj = attendance_details_array[i];
                if (obj['month'] == month_details['month'] && obj['year'] == month_details['year']) {
                    filtered_employees.push(item['employee_number'])
                }
            }
        });

        //console.log(filtered_employees);
        let updateParam = { 'employee_number': { $nin: filtered_employees } };
        let updated = await EmployeeAttendance.updateManyEmployeeAttendance(updateParam, updateObj);


        /* For Adding Holidays In Month */
        let attendanceEmployees = await EmployeeAttendance.getEmployeeAttendance({});

        Promise.all(_.map(attendanceEmployees, async (emp) => {

            let employeeDetails = await Employee.getSpecificEmployeeV2({ 'employment_details.employee_number': emp['employee_number'] });
            employeeDetails = employeeDetails[0];
            const holidays = employeeDetails['employment_details']['unit']['configuration']['holidays'];
            //console.log(holidays)

            let currentMonth = emp['attendance_details'].filter((monthObj) => {

                return monthObj['month'] == month_details['month'] && monthObj['year'] == month_details['year']
            });

            currentMonth = currentMonth[0];
            currentMonth['attendances'] = _.map(currentMonth['attendances'], (attendanceObj) => {

                const dateDay = moment(new Date(attendanceObj['attendance_date'])).format('dddd');
                if (holidays.includes(dateDay)) {
                    attendanceObj['attendance_type'] = ATTENDANCE_TYPES[2]
                }
                return attendanceObj;
            });

            let updateAttObj = {
                $set: {
                    'attendance_details.$.attendances': currentMonth['attendances']
                }

            }

            let updateAttendanceHoliday = await EmployeeAttendance.updateEmployeeAttendance({ '_id': emp['_id'], 'attendance_details._id': currentMonth['_id'] }, updateAttObj)

            return updateAttendanceHoliday;
        })).then((updatedHolidayInAttendanceArray) => {

            let dataResponse = {
                updated,
                updatedHolidayInAttendanceArray
            }

            generateResponse(true, "New Month Added Successfully", dataResponse, res);

        });





    }
    catch (e) {

        console.log(e);
        generateResponse(false, "Unable to add Month", null, res);
    }
}

export async function generateAttendanceReport(req, res) {
    let body = parseBody(req);
    const filename = 'report';
    const selected_fields = 'basic_details employment_details';

    // body["month"] = 11
    // body["year"] = 2019
    if (body['report_type'] == REPORT_TYPES[0]) {

        let extension = 'xlsx';
        let report_url = getReportFilePath(filename, extension);
        let report_path = `${config.app['file_path']}reports/${filename}.${extension}`;
        // let employees = await Employee.getEmployee({}, selected_fields);
        let searchObj = {}
        if(body["unit"] != ""){
            searchObj = {
                'employment_details.unit': body["unit"] ,
            }
        }
        if(body["department"] != ""){
            searchObj = {
                'employment_details.department': body["department"] ,
            }
        }
        let employees = await Employee.getSpecificEmployeeV2( searchObj, selected_fields);
        
        let employeeAttendanceFunctions = [];

        employees.forEach(function (item, index) {

            let employee_number = item['employment_details']['employee_number']

            console.log(employee_number);
            employeeAttendanceFunctions.push(async (callback) => {
                let employee_attendance = await EmployeeAttendance.getSpecificEmployeeAttendance({ 'employee_number': employee_number });


                if (employee_attendance.length > 0) {
                    let attendance = employee_attendance[0]['attendance_details'];
                    attendance = attendance.filter((attendanceObj) => {
                        return attendanceObj.month == body['month'] && attendanceObj.year == body['year'];
                    });
                    employee_attendance[0]['attendance_details'] = attendance;

                    let temp_data = {

                        employee_number: employee_attendance[0]['employee_number'],
                        attendance_details: employee_attendance[0]['attendance_details']

                    }

                    callback(null, temp_data);

                }
                else {

                    let temp_data = {

                        employee_number: employee_number,
                        attendance_details: []
                    }
                    callback(null, temp_data);

                }


            });
        });

        async.parallel(employeeAttendanceFunctions, async (err, attendances) => {

            let employees_data = _.map(employees, (obj, index) => {
                let employee_data_temp = {

                    _id: obj['_id'],
                    basic_details: obj['basic_details'],
                    employment_details: obj['employment_details'],
                    employee_number: attendances[index]['employee_number'],
                    attendance_details: attendances[index]['attendance_details']
                };
                return employee_data_temp;
            });
            await generateExcelReport(report_path, body['month'], body['year'], employees_data);
            generateResponse(true, "Report Generated Successfully", report_url, res);

        });
    }
    else {
        generateResponse(false, "Report Type not available", null, res);
    }

}

export async function createEmployeeInAttendance(req, res) {


    let body = parseBody(req);
    try {
        let create = await EmployeeAttendance.createEmployeeAttendance({
            employee_number: body['employee_number']
        });
        generateResponse(true, "New Employee Added Successfully", create, res);
    }

    catch (e) {

        console.log(e);
        generateResponse(false, "Unable to add Employee", null, res);
    }
}


export async function processEmployeeAttendanceTimes(req, res) {

    try {


        let body = parseBody(req);
        let start_date = new Date(body['start_date']);
        let end_date = new Date(body['end_date']);


        let employees = await Employee.getSpecificEmployeeV2({ 'status.is_activated': 'Activated', 'employment_details.employee_number': { $nin: SYSTEM_EMPLOYEES } });
        let employeeNumbersArray = _.map(employees, (emp) => emp['employment_details']['employee_number'])

        let dates = enumerateDaysBetweenDates(new Date(start_date), new Date(end_date));
        let attendanceDateStringArray = _.map(dates, ele => {

            let tempDate = `${ele.getFullYear().toString()}-${parseInt(ele.getMonth() + 1)}-${ele.getDate()}`
            return tempDate;

        });

        let hoursPipeline = [
            { $unwind: "$attendance_details" },
            { $unwind: "$attendance_details.attendances" },
            {
                $match: {
                    /* 'employee_number': { $in: ['708'] }, */
                    'employee_number': { $in: employeeNumbersArray },
                    'attendance_details.attendances.attendance_date': { $in: attendanceDateStringArray },
                }
            },
            {
                $group: { _id: "$employee_number", "times": { $push: { "date": "$attendance_details.attendances.attendance_date", "service_hours": "$attendance_details.attendances.service_hours", "extra_hours": "$attendance_details.attendances.extra_hours" } } }
            }
        ];

        let employeesData = await EmployeeAttendance.aggregate(hoursPipeline);

        let employeeTimes = _.map(employeesData, (employee) => {

            const employee_number = employee['_id'];
            let total_service_minutes = 0;
            let total_extra_minutes = 0;

            let employee_details = _.filter(employees, (emp) => {

                return emp['employment_details']['employee_number'] === employee_number;

            });
            employee_details = employee_details[0];

            const shift_timings = employee_details['employment_details']['shift_timings'];


            let shiftTimePeriod = calculateServiceHours(shift_timings['time_in'], shift_timings['time_out']);
            shiftTimePeriod = shiftTimePeriod.split(":");
            let shiftTimeInMinutes = convertHourstoMinutes(shiftTimePeriod[0], shiftTimePeriod[1]);


            let requiredTimeInMinutes = 0;
            console.log(shiftTimeInMinutes);

            const holidays = employee_details['employment_details']['unit']['configuration']['holidays'];
            console.log(holidays);


            employee['times'] = _.map(employee['times'], (t) => {

                const currentDay = moment(new Date(t['date'])).format('dddd');

                if (!holidays.includes(currentDay)) {
                    requiredTimeInMinutes = requiredTimeInMinutes + shiftTimeInMinutes
                }

                const service_hours = t['service_hours'].split(":");
                const service_minutes = convertHourstoMinutes(service_hours[0], service_hours[1]);
                total_service_minutes = total_service_minutes + service_minutes;

                const extra_hours = t['extra_hours'].split(":");
                const extra_minutes = convertHourstoMinutes(extra_hours[0], extra_hours[1]);
                total_extra_minutes = total_extra_minutes + extra_minutes;

                t['service_minutes'] = service_minutes;
                t['extra_minutes'] = extra_minutes;
                return t;
            });

            //console.log(requiredTimeInMinutes);

            let data = {

                employee_number: employee_number,
                shift_timings: shift_timings,
                total_required_hours: convertMinutestoHours(requiredTimeInMinutes),
                total_service_hours: convertMinutestoHours(total_service_minutes),
                total_extra_hours: convertMinutestoHours(total_extra_minutes)
            }

            return data;

        });

        generateResponse(true, "employees time periods fetched successfully", employeeTimes, res);
    }
    catch (e) {

        console.log(e);
        generateResponse(false, "unable to fetch employee times periods", null, res);

    }


}


export async function getEmployeeTimeAttendances(req, res) {

    try {

        let body = parseBody(req);

        let start_date = new Date(body['start_date']);
        let end_date = new Date(body['end_date']);
        let employee_number = body['employee_number'];
        let employee = await Employee.getSpecificEmployeeV2({ 'employment_details.employee_number': employee_number });
        employee = employee[0];

        let dates = enumerateDaysBetweenDates(new Date(start_date), new Date(end_date));
        let attendanceDateStringArray = _.map(dates, ele => {

            let tempDate = `${ele.getFullYear().toString()}-${parseInt(ele.getMonth() + 1)}-${ele.getDate()}`
            return tempDate;

        });

        let attendancePeriodTimeline = [
            { $unwind: "$attendance_details" },
            { $unwind: "$attendance_details.attendances" },
            {
                $match: {
                    'employee_number': employee_number,
                    /* 'employee_number': { $in: employeeNumbersArray }, */
                    'attendance_details.attendances.attendance_date': { $in: attendanceDateStringArray },
                }
            }
        ];

        let employeeAttendancesRaw = await EmployeeAttendance.aggregate(attendancePeriodTimeline);
        let employeeAttendances = [];
        if (employeeAttendancesRaw.length > 0) {

            employeeAttendances = _.map(employeeAttendancesRaw, (emp_att) => {

                const data = {

                    employee_number: emp_att['employee_number'],
                    attendance_id: emp_att['attendance_details']['_id'],
                    attendance: emp_att['attendance_details']['attendances']


                }

                return data;

            });

        }

        console.log(employeeAttendances);



        generateResponse(true, "employees time period attendances fetched successfully", employeeAttendances, res);
    }
    catch (e) {

        console.log(e);
        generateResponse(false, "unable to fetch employee times period attendances", null, res);

    }





}

/* General Function */


export async function setEmployeeMonthHolidays(employee_number, month_details) {

    let employeeDetails = await Employee.getSpecificEmployeeV2({ 'employment_details.employee_number': employee_number });
    employeeDetails = employeeDetails[0];
    const holidays = employeeDetails['employment_details']['unit']['configuration']['holidays'];

    month_details['attendances'] = _.map(month_details['attendances'], (attendanceObj) => {

        const dateDay = moment(new Date(attendanceObj['attendance_date'])).format('dddd');
        if (holidays.includes(dateDay)) {
            attendanceObj['attendance_type'] = ATTENDANCE_TYPES[2]
        }
        return attendanceObj;
    });


    return month_details;


}