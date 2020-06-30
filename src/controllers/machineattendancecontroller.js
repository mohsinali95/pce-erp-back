import { parseBody, generateResponse, createCurrentAttendanceMonthObj } from '../utilites';
import { calculateTotalServiceHours, calculateTotalExtraHours, calculateExtraHours, calculateServiceHours, setAttendanceType } from './timecalculationcontroller';
import Employee from '../models/employee';
import EmployeeAttendance from '../models/employeeattendance';


export async function addEmployeeAttendanceTemp(req, res) {
    const body = parseBody(req);
    
    let attendance_month = body['attendance_date'].split('-');
    attendance_month = attendance_month[1];
    /* Iterating on Employees */

    for (let i = 0; i < body['employees'].length; i++) {
        const element = body['employees'][i];
        const employee_number = element['employee_number'];
        console.log(employee_number);

        let employeeAttendanceDetails = await EmployeeAttendance.getSpecificEmployeeAttendance({ 'employee_number': employee_number });
        employeeAttendanceDetails = employeeAttendanceDetails[0];
        for (let i = 0; i < employeeAttendanceDetails.attendance_details.length; i++) {
            const obj = employeeAttendanceDetails.attendance_details[i];
            if (obj['month'] == attendance_month - 1) {

                for (let j = 0; j < obj['attendances'].length; j++) {


                    const attendance_current = obj['attendances'][j];

                    if (attendance_current['attendance_date'] == body['attendance_date']) {

                        console.log(employeeAttendanceDetails['attendance_details'][i]['attendances'][j]);
                        let updateParams = { 'employee_number': employee_number, 'attendance_details._id': employeeAttendanceDetails['attendance_details'][i]['_id'] };

                        let timeInBody = element['timeIn'].split(":");
                        let timeOutBody = element['timeOut'].split(":");
                        let toUpdateAttendanceDay = {

                            _id: attendance_current['_id'],
                            attendance_type: '',
                            attendance_date: attendance_current['attendance_date'],
                            remarks: 'Temporary',
                            service_hours: '00:00',
                            extra_hours: '00:00',
                            time_in: { hour: timeInBody[0], min: timeInBody[1] },
                            time_out: { hour: timeOutBody[0], min: timeOutBody[1] }

                        };

                        employeeAttendanceDetails['attendance_details'][i]['attendances'][j] = toUpdateAttendanceDay;
                        console.log('Data check', employeeAttendanceDetails['attendance_details'][i]['attendances'][j]);
                        let updateObj = {
                            "$set": {
                                'attendance_details.$.attendances': employeeAttendanceDetails['attendance_details'][i]['attendances']
                            }
                        };
                        let updated = await EmployeeAttendance.updateEmployeeAttendance(updateParams, updateObj);
                        console.log(updated);
                    }
                }
            }
        }
    }

    generateResponse(true, `Successfully Updated Attendance - Dated ${body['attendance_date']}`, null, res);
}

export async function addEmployeeAttendanceDayCron(req, res) {

    const body = parseBody(req);
    let attendance_month = body['attendance_date'].split('-');
    attendance_month = attendance_month[1] - 1;

    /* Iterating on Employees */

    for (let i = 0; i < body['employees'].length; i++) {


        const employeeI = body['employees'][i];
        console.log(employeeI['employee_number']);

        const employee_number = employeeI['employee_number'];

        let employeeDetails = await Employee.getSpecificEmployeeV2({ 'employment_details.employee_number': employee_number }, 'basic_details attendance_details');
        let employeeAttendanceDetails = await EmployeeAttendance.getSpecificEmployeeAttendance({'employee_number' : employee_number});
        employeeDetails = employeeDetails[0] 
        employeeAttendanceDetails = employeeAttendanceDetails[0];

        let unitConfigDetails = employeeDetails['employment_details']['unit']['configuration'];

        /* Iterating on Attendance Months */
        for (let j = 0; j < employeeAttendanceDetails.attendance_details.length; j++) {
            const currentMonth = employeeAttendanceDetails.attendance_details[j];

            if (currentMonth['month'] == attendance_month) {
               
                /* Iterating on Attendance Day of Selected Month */
                for (let k = 0; k < currentMonth['attendances'].length; k++) {
                    const currentDay = currentMonth['attendances'][k];
                    if (currentDay['attendance_date'] == body['attendance_date']) {

                        //console.log('Old Object', employeeDetails['attendance_details'][j]['attendances'][k]);


                        let datePreviousAttendanceDetails = currentDay;

                        console.log('Old...' , datePreviousAttendanceDetails);


                        let timeInBody = employeeI['timeIn'].split(":");
                        let timeOutBody = employeeI['timeOut'].split(":");

                        let timeInObj = {
                            hour: timeInBody[0],
                            min: timeInBody[1]
                        }

                        let timeOutObj = {
                            hour: timeOutBody[0],
                            min: timeOutBody[1]

                        }
                        let attendanceType = setAttendanceType(employeeI['timeIn'], employeeI['timeOut'], unitConfigDetails, body['attendance_date']);
                        let extraHoursPerDay = '00:00';
                        let serviceHoursPerDay = '00:00';
                        let TotalExtraHours = currentMonth['total_extra_hours'];
                        let TotalServiceHours = currentMonth['total_service_hours'];

                        if (attendanceType == 'Present' || attendanceType == 'Late') {

                            extraHoursPerDay = calculateExtraHours(unitConfigDetails, timeInObj, timeOutObj, currentDay['attendance_date']);
                            serviceHoursPerDay = calculateServiceHours(timeInObj, timeOutObj);
                            TotalExtraHours = calculateTotalExtraHours(extraHoursPerDay, currentMonth['total_extra_hours'], datePreviousAttendanceDetails['extra_hours']);
                            TotalServiceHours = calculateTotalServiceHours(serviceHoursPerDay, currentMonth['total_service_hours'], datePreviousAttendanceDetails['service_hours'])
                        }


                        let updateParams = { 'employee_number': employeeI['employee_number'], 'attendance_details._id': currentMonth['_id'] };


                        let toUpdateAttendanceDay = {

                            _id: currentDay['_id'],
                            attendance_type: attendanceType,
                            attendance_date: currentDay['attendance_date'],
                            remarks: '',
                            service_hours: serviceHoursPerDay,
                            extra_hours: extraHoursPerDay,
                            time_in: { hour: timeInBody[0], min: timeInBody[1] },
                            time_out: { hour: timeOutBody[0], min: timeOutBody[1] }

                        };

                        employeeDetails['attendance_details'][j]['attendances'][k] = toUpdateAttendanceDay;

                        //console.log('New Object', employeeDetails['attendance_details'][j]['attendances'][k]);

                        let updateObj = {
                            "$set": {
                                'attendance_details.$.total_extra_hours': TotalExtraHours,
                                'attendance_details.$.total_service_hours': TotalServiceHours,
                                'attendance_details.$.leaves_history': [],
                                'attendance_details.$.attendances': employeeDetails['attendance_details'][j]['attendances']
                            }
                        };

                        let updated = await EmployeeAttendance.updateEmployeeAttendance(updateParams, updateObj);
                        console.log(updated);

                        /* Employee.updateEmployee(updateParams, updateObj, (err, update) => {
                            if (err) {
                                console.log(err);
                                generateResponse(false, "Unable to Update", null, res)
                            }
                            console.log(update);

                        }); */

                    }
                }
            }
        }
    }

    generateResponse(true, `Successfully Updated Attendance Locked - Dated ${body['attendance_date']}`, null, res);
}