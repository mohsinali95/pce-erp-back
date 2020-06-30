import cron from 'node-cron';
import Employee from '../models/employee';
import EmployeeAttendance from '../models/employeeattendance';
import TransferRequest from '../models/transferrequest';
import LeaveRequest from '../models/leaverequest';
import { createCurrentAttendanceMonthObj, getNextMonthYear } from '../utilites/index';
import { TRANSFER_TYPES, TRANSFER_REQUEST_STATUS, LEAVE_REQUEST_STATUS } from '../utilites/constants';
import * as _ from 'lodash';
import { setLeavesOnEmployeeAttendance } from '../controllers/leaverequestcontroller';
import moment from 'moment';

  /* Cron for Generate Next Attendance Month On Every 25th of Month at 12:30 AM */
export function createAttendanceMonthEmployeeCron() {


  cron.schedule("30 0 25 * *", async () => {
  
    console.log("At 00:30 on day-of-month 25th.");
    let nextMonthYear = getNextMonthYear(parseInt(new Date().getMonth() + 1))
    let month_details = createCurrentAttendanceMonthObj(nextMonthYear['month'], nextMonthYear['year']);
    let updateObj = {
      $push: {
        'attendance_details': month_details
      }
    };

    let employees = await EmployeeAttendance.getEmployeeAttendance({});
    let filtered_employees = [];

    _.map(employees, (item) => {

      console.log('emp', item['employee_number']);

      const attendance_details_array = item['attendance_details']

      for (let i = 0; i < attendance_details_array.length; i++) {
        const obj = attendance_details_array[i];
        if (obj['month'] === month_details['month'] && obj['year'] === month_details['year']) {
          filtered_employees.push(item['employee_number'])
        }
      }
    });

    console.log(filtered_employees);

    let updateParam = { 'employee_number': { $nin: filtered_employees } };
    let updated = await EmployeeAttendance.updateManyEmployeeAttendance(updateParam, updateObj);


    /* For Adding Holidays In Month */
    let attendanceEmployees = await EmployeeAttendance.getEmployeeAttendance({});

    Promise.all(_.map(attendanceEmployees, async (emp)=>{

        let employeeDetails = await Employee.getSpecificEmployeeV2({'employment_details.employee_number' : emp['employee_number']});
        employeeDetails = employeeDetails[0];
        const holidays = employeeDetails['employment_details']['unit']['configuration']['holidays'];
        //console.log(holidays)

        let currentMonth = emp['attendance_details'].filter((monthObj)=>{

            return monthObj['month'] == month_details['month'] && monthObj['year'] == month_details['year']
        });

        currentMonth = currentMonth[0];
        currentMonth['attendances'] = _.map(currentMonth['attendances'], (attendanceObj)=>{

            const dateDay = moment(new Date(attendanceObj['attendance_date'])).format('dddd');
            if(holidays.includes(dateDay)){   
                attendanceObj['attendance_type'] = ATTENDANCE_TYPES[2] 
            }
            return attendanceObj;                
        });

        let updateAttObj = {
            $set : {
                'attendance_details.$.attendances' : currentMonth['attendances']
            }

        }

        let updateAttendanceHoliday = await EmployeeAttendance.updateEmployeeAttendance({'_id' : emp['_id'], 'attendance_details._id' : currentMonth['_id'] }, updateAttObj)

        return updateAttendanceHoliday;
    })).then((updatedHolidayInAttendanceArray)=>{

        let dataResponse = {
            updated,
            updatedHolidayInAttendanceArray
        } 

        console.log(`Updated: ${updated} at ${new Date}`);
    });
    

  }, {
      scheduled: true,
      timezone: "Asia/Karachi"
    });

}

/* Cron for Reverse Temporary Transfer of Employee to their respective unit and department at 2:00 AM daily. */
export function reverseTemporaryTransfer() {


  cron.schedule("0 2 * * *", async () => {
    console.log("At 02:00 am daily");
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
          updateObj['employment_details.department'] = transfer['transfer_details']['transfer_from']['department']['_id'];
          updateObj['employment_details.unit'] = transfer['transfer_details']['transfer_from']['unit']['_id'];
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

        console.log('Employee Transfer Reversed Successfully', transfers.length);

      }
    });

  }, {
      scheduled: true,
      timezone: "Asia/Karachi"
    });

}


/* Cron for setting leaves on employee attendance before 2 days of leave runs daily at 4:00 AM */
export async function leaveOnEmployeeAttendance(){

  cron.schedule("0 4 * * *", async () => {

    let afterTwoDaysOfCurrentDate = moment().add(2, 'd').toDate();
    /* Time Zone Issue Exist */
    let from = new Date(afterTwoDaysOfCurrentDate.getFullYear(), afterTwoDaysOfCurrentDate.getMonth(), afterTwoDaysOfCurrentDate.getDate(), 5,0,0);
    console.log(from);



    LeaveRequest.getLeaveRequests({from : from, to : from, request_status : [LEAVE_REQUEST_STATUS['approved']] }, async (err, requests)=>{
        
        
        requests.forEach(async (r)=>{

           console.log(r['employee']['employment_details']['employee_number'], [from]);
           await setLeavesOnEmployeeAttendance(r['employee']['employment_details']['employee_number'], [from])

        });
        console.log(requests);
    });
  }, {
    scheduled: true,
    timezone: "Asia/Karachi"
  });



}

/*  cron.schedule("* * * * *", async () => {

    console.log(`Current Time: ${new Date}`);

  }, {
    scheduled: true,
    timezone: "Asia/Karachi"
  }); */