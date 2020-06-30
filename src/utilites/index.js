import config from "../conf/";
import fs from 'fs';
import moment from 'moment';

export function generateResponse(success, message, data, res) {
    res.json({ success, message, data });
}
export function parseBody(req) {
    let obj;
    if (typeof req.body === 'object') {
        obj = req.body;
    } else {
        obj = JSON.parse(req.body);
    }

    return obj;
}
export function getCurrentTimestamp() {
    let date = new Date();
    return date.getTime();
}

export function getPublicEmployeeAssetsFilePath(employee_number, filename) {
    return `${config.app['public_file_path']}users/${employee_number}/${filename}`;

}

export function getPublicEmployeeGuarantorFilePath(employee_number, filename) {

    return `${config.app['public_file_path']}users/${employee_number}/guarantor/${filename}`;

}

export function getReportFilePath(filename, extension) {
    return `${config.app['public_file_path']}reports/${filename}.${extension}`;

}

export function removeFileFromAssets(filePath) {

    try {
        fs.unlinkSync(filePath);
        console.log('successfully deleted');
    } catch (err) {
        // handle the error
        console.log(err);
    }
}


export function numberPadding(number) {

    return number < 10 ? '0' + number : number

}
export function negativeNumberPadding(number) {

    console.log('Type', typeof number);

    return number < 10 ? `-0${number}` : `-${number}`;

}

export function getDates(startDate, endDate) {

    let dates = [],
        currentDate = startDate,
        addDays = function (days) {
            let date = new Date(this.valueOf());
            date.setDate(date.getDate() + days);
            return date;
        };
    while (currentDate <= endDate) {
        dates.push(currentDate);
        currentDate = addDays.call(currentDate, 1);
    }
    return dates;
}

export function getDaysInMonth(month, year) {

    console.log(month, year);
    return new Date(year, parseInt(month) + 1, 0).getDate();
    //return moment

};

export function createCurrentAttendanceMonthObj(month = new Date().getMonth().toString(), year = new Date().getFullYear().toString()) {

    let newAttendanceMonth = {};
    newAttendanceMonth['month'] = month;
    newAttendanceMonth['year'] = year;



    newAttendanceMonth['total_extra_hours'] = '00:00';
    newAttendanceMonth['total_service_hours'] = '00:00';
    newAttendanceMonth['leaves_history'] = [];
    newAttendanceMonth['attendances'] = [];
    const daysInMonth = getDaysInMonth(newAttendanceMonth['month'], newAttendanceMonth['year']);

    for (let i = 1; i <= daysInMonth; i++) {


        const attendanceObj = {
            attendance_type: '',
            attendance_date: `${newAttendanceMonth['year']}-${parseInt(newAttendanceMonth['month']) + 1}-${i}`,
            remarks: '',
            service_hours: '00:00',
            extra_hours: '00:00',
            time_in: {
                hour: '00',
                min: '00'
            },
            time_out: {
                hour: '00',
                min: '00'
            }
        };
        newAttendanceMonth['attendances'].push(attendanceObj);

    }

    return newAttendanceMonth;

}


export function enumerateDaysBetweenDates(fromdate, todate) {


    let dates = [];

    let currDate = moment(fromdate);
    let lastDate = moment(todate);

    dates.push(fromdate);

    while (currDate.add(1, 'days').diff(lastDate) < 0) {
        /* console.log(currDate.toDate()); */
        dates.push(currDate.clone().toDate());
    }

    dates.push(todate);

    return dates;
}

export function calculateDurationBetweenDates(start_date, end_date) {

    end_date = moment(end_date, 'YYYY-MM-DD');
    start_date = moment(start_date, 'YYYY-MM-DD');

    let years = end_date.diff(start_date, 'year');
    start_date.add(years, 'years');

    let months = end_date.diff(start_date, 'months');
    start_date.add(months, 'months');

    let days = end_date.diff(start_date, 'days');

    let duration = '';

    if (years > 0) {

        duration += `${years} Y `
    }
    if (months > 0) {
        duration += `${months} M `
    }

    if (days > 0) {
        duration += `${days} D `
    }

    return duration;

}



export function calculateBenefitsOnSalary(salary) {

    let gross_salary = salary;

    if (typeof gross_salary === 'string') {

        gross_salary = gross_salary.replace(",", "");
    }




    gross_salary = Number(gross_salary);


    if (gross_salary > 0) {


        const hunderdth_divison = 0.01

        /* let basic_pay = hunderdth_divison * 35; */

        /* Basic Pay Calc */

        let basic_pay = (0.606 * gross_salary).toFixed();
        let const_values = 1.7;
        basic_pay = (parseFloat(basic_pay) + parseFloat(const_values)).toFixed();
        /* basic_pay = basic_pay.toFixed() */


        /* House Rent Calc */
        let house_rent = (45 * hunderdth_divison).toFixed(2);
        house_rent = Number(house_rent) * basic_pay;
        house_rent = (house_rent + 3.7).toFixed();

        /* Medical Calc */
        let medical = (10 * hunderdth_divison).toFixed(2);
        medical = Number(medical) * basic_pay;
        medical = (medical + 0.5).toFixed();

        /* Utilites Calc */
        let utilites_all = (10 * hunderdth_divison).toFixed(2);
        utilites_all = Number(utilites_all) * basic_pay;
        utilites_all = (utilites_all + 0.5).toFixed();


        console.log('Basic Pay', basic_pay);
        console.log('House Rent', house_rent);
        console.log('Med', medical);
        console.log('Utilities', utilites_all);


        let benefits = {

            basic_pay: basic_pay,
            house_rent: house_rent,
            medical: medical,
            utilites_all: utilites_all

        }


        return benefits;
    }
    else {
        let benefits = {

            basic_pay: 0,
            house_rent: 0,
            medical: 0,
            utilites_all: 0

        }


        return benefits;

    }




}


export function processSalary(salary) {

    console.log(salary);

    salary = salary.toString();
    let gross_salary = salary.replace(",", "");
    gross_salary = Number(gross_salary);
    return gross_salary;

}


export function parseTimeObjToHourMin(TimeObj) {

    /* console.log(TimeObj) */

    let timehourMin = `${TimeObj['hour']}:${TimeObj['min']}`
    return timehourMin;




}



export function getNextMonthYear(month) {

    /* parseInt(new Date(date).getMonth()+1) */

    let dateMonthObj = {};

    let now = new Date();
    if (month > 11) {

        dateMonthObj = {
            month: new Date(now.getFullYear() + 1, 0, 1).getMonth(),
            year: new Date(now.getFullYear() + 1, 0, 1).getFullYear()

        }

    }
    else {

        dateMonthObj = {
            month: month,
            year: now.getFullYear()

        }

    }

    return dateMonthObj;



}