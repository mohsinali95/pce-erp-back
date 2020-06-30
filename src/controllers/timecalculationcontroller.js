import moment from 'moment';
import { numberPadding, negativeNumberPadding, parseTimeObjToHourMin } from '../utilites';



export function convertHourstoMinutes(hours, minutes) {


    hours = parseInt(hours);
    minutes = parseInt(minutes);

    const minuteInHour = 60;
    let totalMinutes = hours * minuteInHour;
    totalMinutes = totalMinutes + minutes;
    return totalMinutes;

}


export function convertMinutestoHours(totalMinutes) {

    totalMinutes = parseInt(totalMinutes);
    const minuteInHour = 60;
    let hours = 0;
    let minutes = 0;


    if (totalMinutes < 0) {

        totalMinutes = totalMinutes * -1;
        hours = Math.floor(totalMinutes / minuteInHour);

        minutes = totalMinutes % minuteInHour;
        hours = hours == 0 ? hours : hours * -1;
        minutes = minutes == 0 ? minutes : minutes * -1;

    }
    else {

        hours = Math.floor(totalMinutes / minuteInHour);
        minutes = totalMinutes % minuteInHour;
    }
    return `${hours}:${minutes}`;
}

export function calculateTotalServiceHours(servicehours, totalServiceHours, previousservioushours) {

    /*  console.log('AAAAAAA') */
    /* console.log(servicehours, totalServiceHours, previousservioushours) */

    let serviceHoursMinutesArray = servicehours.split(':');
    let totalHoursMinutesArray = totalServiceHours.split(':');
    let previousServiceHoursMinutesArray = previousservioushours.split(':');

    let totalServiceTime = 0;

    let totalServiceMinutes = convertHourstoMinutes(totalHoursMinutesArray[0], totalHoursMinutesArray[1]);
    let previousServiceMinutes = convertHourstoMinutes(previousServiceHoursMinutesArray[0], previousServiceHoursMinutesArray[1]);
    let serviceHoursMinutes = convertHourstoMinutes(serviceHoursMinutesArray[0], serviceHoursMinutesArray[1]);
    //console.log('Test 3: P ', previousServiceMinutes);
    totalServiceMinutes = totalServiceMinutes - previousServiceMinutes;
    //console.log('Test 1: ', totalServiceMinutes);
    totalServiceTime = totalServiceMinutes + serviceHoursMinutes;
    //console.log('Test 2: ', totalServiceMinutes);
    let totalServiceHoursMinutes = convertMinutestoHours(totalServiceTime);

    return totalServiceHoursMinutes;
}
export function calculateTotalExtraHours(extrahours, totalextrahours, previousextrahours) {

    console.log(extrahours, totalextrahours, previousextrahours);

    let extraHoursMinutesArray = extrahours.split(':');
    let totalExtratHoursMinutesArray = totalextrahours.split(':');
    let previousExtraHoursMinutesArray = previousextrahours.split(':');

    let totalExtraMinutes = convertHourstoMinutes(totalExtratHoursMinutesArray[0], totalExtratHoursMinutesArray[1]);
    let previousExtraMinutes = convertHourstoMinutes(previousExtraHoursMinutesArray[0], previousExtraHoursMinutesArray[1]);
    let extraHoursMinutes = convertHourstoMinutes(extraHoursMinutesArray[0], extraHoursMinutesArray[1]);

    console.log('Mins', totalExtraMinutes, previousExtraMinutes, extraHoursMinutes);

    totalExtraMinutes = totalExtraMinutes - previousExtraMinutes;
    totalExtraMinutes = totalExtraMinutes + extraHoursMinutes;
    console.log(totalExtraMinutes);

    let totalExtraHoursMinutes = convertMinutestoHours(totalExtraMinutes);

    console.log('Final Total Extra Hours', totalExtraHoursMinutes);
    return totalExtraHoursMinutes;
}

export function calculateServiceHours(time_in, time_out) {

    let startTime = moment(`${time_in['hour']}:${time_in['min']}`, "HH:mm");
    let endTime = moment(`${time_out['hour']}:${time_out['min']}`, "HH:mm");
    let duration = moment.duration(endTime.diff(startTime));
    console.log("startTime",startTime)
    console.log("endTime",endTime)
    let hours = parseInt(duration.asHours());
    let minutes = parseInt(duration.asMinutes()) % 60;
console.log("hours",hours)
console.log("minutes",minutes)
let temp = moment(`${hours}:${minutes}`, "HH:mm").format("HH:mm")
console.log("temp",temp)
    return moment(`${hours}:${minutes}`, "HH:mm").format("HH:mm");

}
export function calculateExtraHours(unit_configuration, time_in, time_out, current_date) {

    let unitWeekStart = unit_configuration['week_start'];
    current_date = new Date(current_date);
    let currentDay = moment(current_date).format('dddd');
    console.log('Check here', currentDay);
    console.log(unitWeekStart);

    if (unitWeekStart == currentDay) {

        /* Calculate extra hours Before Unit time start */
        let timeIn = moment(`${time_in['hour']}:${time_in['min']}`, "HH:mm");
        let unitServiceTimeIn = moment(`${unit_configuration['working_hours']['from']['hour']}:${unit_configuration['working_hours']['from']['min']}`, "HH:mm");
        let durationIn = moment.duration(unitServiceTimeIn.diff(timeIn));
        let hoursIn = parseInt(durationIn.asHours());
        let minutesIn = parseInt(durationIn.asMinutes()) % 60;
        if (hoursIn < 0) {
            hoursIn = 0;
        }
        if (minutesIn < 0) {
            minutesIn = 0;
        }


        /* Calculate extra hours After Unit time over */
        let timeOut = moment(`${time_out['hour']}:${time_out['min']}`, "HH:mm");
        let unitServiceTimeOut = moment(`${unit_configuration['working_hours']['to']['hour']}:${unit_configuration['working_hours']['to']['min']}`, "HH:mm");
        let durationOut = moment.duration(timeOut.diff(unitServiceTimeOut));
        let hoursOut = parseInt(durationOut.asHours());
        let minutesOut = parseInt(durationOut.asMinutes()) % 60;
        let time_one = {

            'hours': hoursIn,
            'minutes': minutesIn

        };

        let time_two = {
            'hours': hoursOut,
            'minutes': minutesOut
        };
         

        let time_one_minutes = convertHourstoMinutes(time_one['hours'], time_one['minutes']);
        let time_two_minutes = convertHourstoMinutes(time_two['hours'], time_two['minutes']);
        let total_timeMinutes = time_one_minutes + time_two_minutes;
        

        let totalTime = convertMinutestoHours(total_timeMinutes);

        /* console.log('Weekday Total Extra Hours', totalTime); */


        /* Calculate Unit Hours */
       /*  let unitTime = moment.duration(unitServiceTimeOut.diff(unitServiceTimeIn));
        let unitHoursTime = parseInt(unitTime.asHours());
        let unitMinutesTime = parseInt(unitTime.asMinutes()) % 60;
        let totalUnitMinutes = convertHourstoMinutes(unitHoursTime, unitMinutesTime);
 */

        /* Calculate Service Hours */
       /*  let serviceTime = moment.duration(timeOut.diff(timeIn));
        let serviceHoursTime = parseInt(serviceTime.asHours());
        let serviceMinutesTime = parseInt(serviceTime.asMinutes()) % 60;

        let totalServiceTime = convertHourstoMinutes(serviceHoursTime, serviceMinutesTime); 

        console.log('Total Unit Minutes', totalUnitMinutes);
        console.log('Total Service Minutes', totalServiceTime); */
   
        console.log(totalTime)
        return totalTime;

 
    }
    else {
        /* Calculate extra hours Before Unit time start */
        let timeIn = moment(`${time_in['hour']}:${time_in['min']}`, "HH:mm");
        let unitServiceTimeIn = moment(`${unit_configuration['working_hours']['from']['hour']}:${unit_configuration['working_hours']['from']['min']}`, "HH:mm");
        let durationIn = moment.duration(unitServiceTimeIn.diff(timeIn));
        let hoursIn = parseInt(durationIn.asHours());
        let minutesIn = parseInt(durationIn.asMinutes()) % 60;


        /* Calculate extra hours After Unit time over */
        let timeOut = moment(`${time_out['hour']}:${time_out['min']}`, "HH:mm");
        let unitServiceTimeOut = moment(`${unit_configuration['working_hours']['to']['hour']}:${unit_configuration['working_hours']['to']['min']}`, "HH:mm");
        let durationOut = moment.duration(timeOut.diff(unitServiceTimeOut));
        let hoursOut = parseInt(durationOut.asHours());
        let minutesOut = parseInt(durationOut.asMinutes()) % 60;

        let time_one = {

            'hours': hoursIn,
            'minutes': minutesIn

        };

        //console.log(time_one)

        let time_two = {
            'hours': hoursOut,
            'minutes': minutesOut
        };

        //console.log(time_two)

        let time_one_minutes = convertHourstoMinutes(time_one['hours'], time_one['minutes']);


        let time_two_minutes = convertHourstoMinutes(time_two['hours'], time_two['minutes']);

        //console.log('T1', time_one_minutes);
        //console.log('T2', time_two_minutes);


        let total_timeMinutes = time_one_minutes + time_two_minutes;

        //console.log(total_timeMinutes);
        let totalTime = convertMinutestoHours(total_timeMinutes);

        console.log('Other Day Total Extra Hours', totalTime);

        return totalTime;
    }
}

export function calculateExtraHoursEmployeeShift(unit_configuration, time_in, time_out, attendance_date, employee_shift_timings){

    /* console.log('E S T', employee_shift_timings); */

    let unitWeekStart = unit_configuration['week_start'];
    attendance_date = new Date(attendance_date);
    let currentDay = moment(attendance_date).format('dddd');
    console.log('Check here', currentDay);
    console.log(unitWeekStart);

    if (unitWeekStart == currentDay) {

        /* Calculate extra hours Before Unit time start */
        let timeIn = moment(`${time_in['hour']}:${time_in['min']}`, "HH:mm");
        //let unitServiceTimeIn = moment(`${unit_configuration['working_hours']['from']['hour']}:${unit_configuration['working_hours']['from']['min']}`, "HH:mm");
        let employeeShiftTimeIn = moment(`${employee_shift_timings['time_in']['hour']}:${employee_shift_timings['time_in']['min']}`, "HH:mm");
        let durationIn = moment.duration(employeeShiftTimeIn.diff(timeIn));
        let hoursIn = parseInt(durationIn.asHours());
        let minutesIn = parseInt(durationIn.asMinutes()) % 60;
        if (hoursIn < 0) {
            hoursIn = 0;
        }
        if (minutesIn < 0) {
            minutesIn = 0;
        }


        /* Calculate extra hours After Unit time over */
        let timeOut = moment(`${time_out['hour']}:${time_out['min']}`, "HH:mm");
        let employeeShiftTimeOut = moment(`${employee_shift_timings['time_out']['hour']}:${employee_shift_timings['time_out']['min']}`, "HH:mm");
        let durationOut = moment.duration(timeOut.diff(employeeShiftTimeOut));
        let hoursOut = parseInt(durationOut.asHours());
        let minutesOut = parseInt(durationOut.asMinutes()) % 60;
        let time_one = {

            'hours': hoursIn,
            'minutes': minutesIn

        };

        let time_two = {
            'hours': hoursOut,
            'minutes': minutesOut
        };
         

        let time_one_minutes = convertHourstoMinutes(time_one['hours'], time_one['minutes']);
        let time_two_minutes = convertHourstoMinutes(time_two['hours'], time_two['minutes']);
        let total_timeMinutes = time_one_minutes + time_two_minutes;
        

        let totalTime = convertMinutestoHours(total_timeMinutes);
   
        console.log(totalTime)
        return totalTime;

 
    }
    else {
        /* Calculate extra hours Before Unit time start */
        let timeIn = moment(`${time_in['hour']}:${time_in['min']}`, "HH:mm");
        //let unitServiceTimeIn = moment(`${unit_configuration['working_hours']['from']['hour']}:${unit_configuration['working_hours']['from']['min']}`, "HH:mm");
        let employeeShiftTimeIn = moment(`${employee_shift_timings['time_in']['hour']}:${employee_shift_timings['time_in']['min']}`, "HH:mm");
        let durationIn = moment.duration(employeeShiftTimeIn.diff(timeIn));
        let hoursIn = parseInt(durationIn.asHours());
        let minutesIn = parseInt(durationIn.asMinutes()) % 60;


        /* Calculate extra hours After Unit time over */
        let timeOut = moment(`${time_out['hour']}:${time_out['min']}`, "HH:mm");
        //let unitServiceTimeOut = moment(`${unit_configuration['working_hours']['to']['hour']}:${unit_configuration['working_hours']['to']['min']}`, "HH:mm");
        let employeeShiftTimeOut = moment(`${employee_shift_timings['time_out']['hour']}:${employee_shift_timings['time_out']['min']}`, "HH:mm");
        let durationOut = moment.duration(timeOut.diff(employeeShiftTimeOut));
        let hoursOut = parseInt(durationOut.asHours());
        let minutesOut = parseInt(durationOut.asMinutes()) % 60;

        let time_one = {

            'hours': hoursIn,
            'minutes': minutesIn

        };

        //console.log(time_one)

        let time_two = {
            'hours': hoursOut,
            'minutes': minutesOut
        };

        //console.log(time_two)

        let time_one_minutes = convertHourstoMinutes(time_one['hours'], time_one['minutes']);
        let time_two_minutes = convertHourstoMinutes(time_two['hours'], time_two['minutes']);

        //console.log('T1', time_one_minutes);
        //console.log('T2', time_two_minutes);


        let total_timeMinutes = time_one_minutes + time_two_minutes;

        //console.log(total_timeMinutes);
        let totalTime = convertMinutestoHours(total_timeMinutes);

        console.log('Other Day Total Extra Hours', totalTime);

        return totalTime;
    }

}





export function setAttendanceType(timeIn, timeOut, unitConfig, attendance_date) {

    console.log('---------------------------------------------');

    let week_start = unitConfig['week_start'];
    attendance_date = moment(attendance_date, 'YYYY-MM-DD');
    let current_day = moment(attendance_date).format('dddd');
    let unit_entry_time = unitConfig['working_hours']['from']['hour'] + ':' + unitConfig['working_hours']['from']['min'];


    let additionalTime = moment(unit_entry_time, "HH:mm").add('30', 'minutes');
    let timeInMoment = moment(timeIn, "HH:mm");

    console.log(timeInMoment.isBefore(additionalTime));
    

    if (current_day == week_start) {

        if (timeIn == '00:00' || timeOut == '00:00') {

            return 'Absent'
        }
        else {

            if (timeInMoment.isBefore(additionalTime)) {

                return "Present"
            }
            else {

                return 'Late'
            }
        }

    } else {

        if (timeIn == '00:00' || timeOut == '00:00') {

            return 'Absent'
        }
        else {

            return "Present"

        }

    }
}


export function setAttendanceTypeZKTeco(timeInObj, timeOutObj, unitConfig, attendance_date, employee_shift_timings){

    let week_start = unitConfig['week_start'];
    attendance_date = moment(attendance_date, 'YYYY-MM-DD');
    let current_day = moment(attendance_date).format('dddd');
    let timeIn = parseTimeObjToHourMin(timeInObj);
    let timeOut = parseTimeObjToHourMin(timeOutObj);
    console.log('T I', timeIn);
    console.log('T O', timeOut);


    let employeeShiftTime = employee_shift_timings['time_in']['hour'] + ':' + employee_shift_timings['time_in']['min'];
    console.log(employeeShiftTime);

    let additionalTime = moment(employeeShiftTime, "HH:mm").add('31', 'minutes');
    let timeInMoment = moment(timeIn, "HH:mm");
    if (current_day == week_start) {

        if (timeIn == '00:00' || timeOut == '00:00') {

            return 'Absent'
        }
        else {

            if (timeInMoment.isBefore(additionalTime)) {

                return "Present"
            }
            else {

                return 'Late'
            }
        }

    } else {

        if (timeIn == '00:00' || timeOut == '00:00') {

            return 'Absent'
        }
        else {

          
            if (timeInMoment.isBefore(additionalTime)) {

                return "Present"
            }
            else {

                return 'Late'
            }
        }

    }


}