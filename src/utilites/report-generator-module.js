import xl from 'excel4node';
import moment from 'moment';
import { getDaysInMonth } from './';
import { ATTENDANCE_TYPES } from './constants';
import { parseTimeObjToHourMin } from '../utilites';


export function generateExcelReport(report_path, month, year, employees) {

    let workbook = new xl.Workbook();
    let worksheet = workbook.addWorksheet('sheet');

    let month_name = moment(parseInt(month) + 1, 'M').format('MMMM');
    let totalDays = getDaysInMonth(month, year);
    let totalDaysDouble = totalDays * 2;
    console.log('Days', totalDays);

    const headline_style = workbook.createStyle({

        font: {
            color: '#5E5E5E',
            size: 22,
            bold: true
        },
        alignment: {
            shrinkToFit: true,
            wrapText: true
        }

    });

    const month_style = workbook.createStyle({

        font: {
            color: '#316886',
            size: 14
        },
        alignment: {
            shrinkToFit: false,
            /* wrapText: false */
        }
    });
    /* Setting Heading */
    worksheet.cell(1, 1, 2, totalDaysDouble + 9, true).string('EMPLOYEE ATTENDANCE SHEET').style(headline_style);
    worksheet.cell(3, 1, 3, totalDaysDouble + 9, true).string(`${month_name} - ${year}`).style(month_style);

    /* Employee Names */
    worksheet.column(1).setWidth(25);
    worksheet.column(2).setWidth(15);
    worksheet.column(3).setWidth(25);
    worksheet.column(5).setWidth(25);
    worksheet.column(totalDaysDouble + 8).setWidth(10);
    worksheet.column(totalDaysDouble + 9).setWidth(25);

    worksheet.cell(6, 1).string('Employees').style({ alignment: { wrapText: true, horizontal: 'center', vertical: "center" }, font: { bold: true } });
    worksheet.cell(6, 2).string('Employee Code').style({ alignment: { wrapText: true, horizontal: 'center', vertical: "center" }, font: { bold: true } });
    worksheet.cell(6, 3).string('Unit').style({ alignment: { wrapText: true, horizontal: 'center', vertical: "center" }, font: { bold: true } });
    worksheet.cell(6, 4).string('Role').style({ alignment: { wrapText: true, horizontal: 'center', vertical: "center" }, font: { bold: true } });
    worksheet.cell(6, 5).string('Department').style({ alignment: { wrapText: true, horizontal: 'center', vertical: "center" }, font: { bold: true } });

    /* Days and Dates - Iteration through columns */

    let index = 0;
    while (totalDaysDouble > index) {
        /* console.log(`${year}-${parseInt(month)+1}-${index+1}`); */
        const day = moment(`${year}-${parseInt(month) + 1}-${(index / 2) + 1}`, "YYYY-MM-DD").format('ddd');
        const date = (index / 2) + 1;

        worksheet.column(6 + index).setWidth(10);
        worksheet.cell(4, 6 + index, 4, 7 + index, true).string(day).style({ alignment: { wrapText: true, horizontal: 'center', vertical: "center" }, font: { bold: true } });
        worksheet.cell(5, 6 + index, 5, 7 + index, true).string(date.toString()).style({ alignment: { wrapText: true, horizontal: 'center', vertical: "center" }, font: { bold: true } });
        worksheet.cell(6, 6 + index).string("Time in").style({ alignment: { wrapText: true, horizontal: 'center', vertical: "center" }, font: { bold: true } });
        worksheet.cell(6, 7 + index).string("Time out").style({ alignment: { wrapText: true, horizontal: 'center', vertical: "center" }, font: { bold: true } });

        index += 2;
    }

    worksheet.cell(4, 6 + totalDaysDouble, 5, 7 + totalDaysDouble, true).string("Total").style({ alignment: { wrapText: true, horizontal: 'center', vertical: "center" }, font: { bold: true } });
    worksheet.cell(4, 8 + totalDaysDouble, 5, 9 + totalDaysDouble, true).string("Late Fine").style({ alignment: { wrapText: true, horizontal: 'center', vertical: "center" }, font: { bold: true } });

    worksheet.cell(6, totalDaysDouble + 6).string("In Hours	").style({ alignment: { wrapText: true, horizontal: 'center', vertical: "center" }, font: { bold: true } });
    worksheet.cell(6, totalDaysDouble + 7).string("Overtime").style({ alignment: { wrapText: true, horizontal: 'center', vertical: "center" }, font: { bold: true } });
    worksheet.cell(6, totalDaysDouble + 8).string("Total").style({ alignment: { wrapText: true, horizontal: 'center', vertical: "center" }, font: { bold: true } });
    worksheet.cell(6, totalDaysDouble + 9).string("Fine Calculation").style({ alignment: { wrapText: true, horizontal: 'center', vertical: "center" }, font: { bold: true } });

    /* Employee names and number - iteration through rows */


    for (let index = 0; index < employees.length; index++) {
        const employeeName = `${employees[index]['basic_details']['firstname']} ${employees[index]['basic_details']['lastname']}`
        const employeeNumber = `${employees[index]['employment_details']['employee_number']}`
        let employeeRole = ""
        if (employees[index]["basic_details"]["role"] != null) {

            employeeRole = `${employees[index]["basic_details"]["role"]["name"]}`
        }
        const employeeUnit = `${employees[index]["employment_details"]["unit"]["name"]}`
        const employeeUnitCode = `${employees[index]["employment_details"]["unit"]["code"]}`
        const employeeDept = `${employees[index]["employment_details"]["department"]["name"]}`



        worksheet.cell(7 + index, 2).string(employeeNumber);
        worksheet.cell(7 + index, 1).string(employeeName);
        worksheet.cell(7 + index, 3).string(employeeUnit);
        worksheet.cell(7 + index, 4).string(employeeRole);
        worksheet.cell(7 + index, 5).string(employeeDept);

        /*  console.log(employees[index]['attendance_details'][0]) */

        if (employees[index]['attendance_details'].length != 0) {
            const attendanceArray = employees[index]['attendance_details'][0]['attendances'];
            const totalExtraHours = employees[index]['attendance_details'][0]['total_extra_hours'];
            const totalServiceHours = employees[index]['attendance_details'][0]['total_service_hours'];
            let employeeShiftTimeIn = "00:00"
            let employeeShiftTimeOut = "00:00"

            console.log(employees[index]["employment_details"]["shift_timings"])
            if (typeof employees[index]["employment_details"]["shift_timings"] != "undefined") {
                employeeShiftTimeIn = parseTimeObjToHourMin(employees[index]["employment_details"]["shift_timings"]["time_in"]);
                employeeShiftTimeOut = parseTimeObjToHourMin(employees[index]["employment_details"]["shift_timings"]["time_out"]);
            }
            // for (let j = 0; j < attendanceArray.length; j++) {
            //     const att_type = getAttendanceType(attendanceArray[j]['attendance_type']);
            //     worksheet.cell(6 + index, 2 + j).string(att_type);
            //     worksheet.cell(6 + index, 3 + j).string("opps");

            // }

            //process attendance
            let j = 0;
            let totalFineAmount = 0
            while (totalDaysDouble > j) {
                const att_type = getAttendanceType(attendanceArray[(j / 2)]['attendance_type']);
                let timeIn = parseTimeObjToHourMin(attendanceArray[(j / 2)]["time_in"])
                let timeOut = parseTimeObjToHourMin(attendanceArray[(j / 2)]["time_out"])

                //process late coming deduction
                    if (employeeUnitCode == "27464") {
                        let fineObj = processHeadOfficeLateFine(timeIn, timeOut, employeeShiftTimeIn, employeeShiftTimeOut)
                        totalFineAmount += fineObj.fineAmount
                    } else {
                        let fineObj = processLateFine(timeIn, timeOut, employeeShiftTimeIn, employeeShiftTimeOut)
                        totalFineAmount += fineObj.fineAmount
                    }


                worksheet.cell(7 + index, 6 + j).string(timeIn);
                worksheet.cell(7 + index, 7 + j).string(timeOut);
                j += 2
            }
            let totalExtraHoursTemp = totalExtraHours.split(":")
            if (parseInt(totalExtraHoursTemp[0]) < 0) {
                totalExtraHoursTemp[0] = "00"
            }
            if (parseInt(totalExtraHoursTemp[1]) < 0) {
                totalExtraHoursTemp[1] = "00"
            }
            let totalServiceHoursTemp = totalServiceHours.split(":")
            if (parseInt(totalServiceHoursTemp[0]) < 0) {
                totalServiceHoursTemp[0] = "00"
            }
            if (parseInt(totalServiceHoursTemp[1]) < 0) {
                totalServiceHoursTemp[1] = "00"
            }
            worksheet.cell(7 + index, 6 + j).string(`${totalServiceHoursTemp[0]}:${totalServiceHoursTemp[1]}`);
            worksheet.cell(7 + index, 7 + j).string(`${totalExtraHoursTemp[0]}:${totalExtraHoursTemp[1]}`);
            worksheet.cell(7 + index, 8 + j).string(`${totalFineAmount}`);


        }
    }


    workbook.write(report_path);

}

const headOfficeLateFines = {
    fineOne: 1.5,
    fineTwo: 5,
    fineThree: 7,
    zeroShiftDuration: 0,
    firstShiftDuration: 15,
    secondShiftDuration: 30 + 15,
    thridShiftDuration: 90 + 15 + 30,
}

const branchLateFines = {
    fineOne: 3,
    fineTwo: 5,
    fineThree: 7,
    zeroShiftDuration: 0,
    firstShiftDuration: 30,
    secondShiftDuration: 30 + 30,
    thridShiftDuration: 90 + 30 + 30,
}

function processHeadOfficeLateFine(timeIn, timeOut, employeeShiftTimeIn, employeeShiftTimeOut) {
    let fineAmount = 0;
    let fineObj = {
        fineDetail: "",
        fineAmount: 0
    }
    timeIn = moment(timeIn, "HH:mm")
    timeOut = moment(timeIn, "HH:mm")
    employeeShiftTimeIn = moment(employeeShiftTimeIn, "HH:mm").add("15", "minutes")

    let timeInDuration = moment.duration(timeIn.diff(moment(employeeShiftTimeIn, "HH:mm"))).asMinutes()
    console.log(timeInDuration, "duration")
    if (timeInDuration <= headOfficeLateFines.zeroShiftDuration) {
        fineObj.fineAmount = fineAmount

        return fineObj
    } else if (timeInDuration <= headOfficeLateFines.firstShiftDuration && timeInDuration > headOfficeLateFines.zeroShiftDuration) {

        fineAmount = headOfficeLateFines.fineOne * timeInDuration
        fineObj.fineAmount = fineAmount

        fineObj.fineDetail = `${headOfficeLateFines.fineOne} * ${timeInDuration}`
        return fineObj


    } else if (timeInDuration > headOfficeLateFines.firstShiftDuration && timeInDuration <= headOfficeLateFines.secondShiftDuration) {

        timeInDuration -= headOfficeLateFines.firstShiftDuration
        fineAmount = (headOfficeLateFines.fineOne * 15) + (headOfficeLateFines.fineTwo * timeInDuration)
        fineObj.fineAmount = fineAmount

        fineObj.fineDetail = `(${headOfficeLateFines.fineOne} * 15) + (${headOfficeLateFines.fineTwo} * ${timeInDuration})`
        return fineObj

    } else if (timeInDuration > headOfficeLateFines.secondShiftDuration && timeInDuration <= headOfficeLateFines.thridShiftDuration) {

        timeInDuration -= headOfficeLateFines.secondShiftDuration
        fineAmount = (headOfficeLateFines.fineOne * 15) + (headOfficeLateFines.fineTwo * 30) + (headOfficeLateFines.fineThree * timeInDuration)
        fineObj.fineAmount = fineAmount

        fineObj.fineDetail = `(${headOfficeLateFines.fineOne} * 15) + (${headOfficeLateFines.fineTwo} * 30) + (${headOfficeLateFines.fineThree} * ${timeInDuration})`
        return fineObj

    } else if (timeInDuration > headOfficeLateFines.thridShiftDuration) {

        return fineObj
    }

}

function processLateFine(timeIn, timeOut, employeeShiftTimeIn, employeeShiftTimeOut) {
    let fineAmount = 0;
    let fineObj = {
        fineDetail: "",
        fineAmount: 0
    }

    timeIn = moment(timeIn, "HH:mm")
    timeOut = moment(timeIn, "HH:mm")
    employeeShiftTimeIn = moment(employeeShiftTimeIn, "HH:mm").add("30", "minutes")
    let timeInDuration = moment.duration(timeIn.diff(moment(employeeShiftTimeIn, "HH:mm"))).asMinutes()
    if (timeInDuration <= branchLateFines.zeroShiftDuration) {
        fineObj.fineAmount = fineAmount
        return fineObj
    } else if (timeInDuration <= branchLateFines.firstShiftDuration && timeInDuration > branchLateFines.zeroShiftDuration) {

        fineAmount = branchLateFines.fineOne * timeInDuration

        fineObj.fineAmount = fineAmount
        fineObj.fineDetail = `${branchLateFines.fineOne} * ${timeInDuration}`
        return fineObj


    } else if (timeInDuration > branchLateFines.firstShiftDuration && timeInDuration <= branchLateFines.secondShiftDuration) {

        timeInDuration -= branchLateFines.firstShiftDuration
        fineAmount = (branchLateFines.fineOne * 30) + (branchLateFines.fineTwo * timeInDuration)

        fineObj.fineAmount = fineAmount
        fineObj.fineDetail = `(${branchLateFines.fineOne} * 30) + (${branchLateFines.fineTwo} * ${timeInDuration})`
        return fineObj

    } else if (timeInDuration > branchLateFines.secondShiftDuration && timeInDuration <= branchLateFines.thridShiftDuration) {

        timeInDuration -= branchLateFines.secondShiftDuration
        fineAmount = (branchLateFines.fineOne * 30) + (branchLateFines.fineTwo * 30) + (branchLateFines.fineThree * timeInDuration)
        fineObj.fineAmount = fineAmount
        fineObj.fineDetail = `(${branchLateFines.fineOne} * 30) + (${branchLateFines.fineTwo} * 30) + (${branchLateFines.fineThree} * ${timeInDuration})`
        return fineObj

    } else if (timeInDuration > branchLateFines.thridShiftDuration) {

        return fineObj
    }

}
export function generateBranchListing(units, report_path) {


    let workbook = new xl.Workbook();
    let worksheet = workbook.addWorksheet('units');

    const header_style = workbook.createStyle({

        font: {
            color: '#316886',
            size: 12
        },
        alignment: {
            shrinkToFit: false
        }
    });

    const data_style = workbook.createStyle({

        font: {
            size: 8
        },
        alignment: {
            shrinkToFit: false
        }
    });


    worksheet.column(1).setWidth(5);
    worksheet.column(2).setWidth(30);
    worksheet.column(3).setWidth(12);
    worksheet.column(4).setWidth(12);
    worksheet.column(5).setWidth(100);
    worksheet.cell(1, 1).string('S. No').style(header_style);
    worksheet.cell(1, 2).string('Branch Name').style(header_style);
    worksheet.cell(1, 3).string('Prefix').style(header_style);
    worksheet.cell(1, 4).string('Code').style(header_style);
    /* worksheet.cell(1, 5).string('Address').style(header_style); */


    //worksheet.cell(2, 1).string("1");


    for (let index = 0; index < units.length; index++) {
        const element = units[index];

        worksheet.cell(2 + index, 1).string((index + 1).toString()).style(data_style);
        worksheet.cell(2 + index, 2).string(element['name']).style(data_style);
        worksheet.cell(2 + index, 3).string('prefix' in element ? element['prefix'] : '-').style(data_style);
        worksheet.cell(2 + index, 4).string(element['code']).style(data_style);
        /* worksheet.cell(2 + index,5).string(element['address']); */
    }


    workbook.write(report_path);


}


export function generatePayroll(report_path, payroll_details, employees) {

    let workbook = new xl.Workbook();
    let worksheet = workbook.addWorksheet(`${payroll_details['for_month']['month']}-${payroll_details['for_month']['year']}`);

    const headline_style = workbook.createStyle({

        font: {

            size: 12,
            bold: true
        },
        alignment: {
            shrinkToFit: true,
            wrapText: true
        }

    });


    const data_style = workbook.createStyle({

        font: {
            size: 8
        },
        alignment: {
            shrinkToFit: false
        }
    });
    /* Headlines */
    worksheet.cell(1, 2, 1, 31, true).string('M/s Muhammadi Currency Exchange Company (Pvt.) Ltd.').style(headline_style);
    worksheet.cell(2, 2, 2, 31, true).string('Head Office Karachi');
    worksheet.cell(3, 2, 3, 31, true).string('Payroll Sheet').style({ font: { size: 10 } });
    worksheet.cell(4, 2, 4, 31, true).string(`For The Month ${payroll_details['for_month']['month']}-${payroll_details['for_month']['year']}`).style({ font: { size: 10 } });

    /* Headers */
    /* worksheet.cell(6, 1).string('Payroll Sheet').style({font: { size: 10}}); */


    const header_style = workbook.createStyle({

        font: {
            size: 7,
            bold: true,
        },
        /* fill:{
            bgColor: '#dddddd'
        }, */
        fill: {
            type: 'pattern', // the only one implemented so far.
            patternType: 'solid', // most common.
            fgColor: 'dddddd', // you can add two extra characters to serve as alpha, i.e. '2172d7aa'.

        },
        alignment: {
            shrinkToFit: false,
            horizontal: 'center'
        }
    });


    worksheet.column(1).setWidth(18);
    worksheet.column(2).setWidth(10);
    worksheet.column(3).setWidth(10);
    worksheet.column(4).setWidth(5);
    worksheet.column(5).setWidth(28);
    worksheet.column(6).setWidth(12);
    worksheet.column(7).setWidth(3);
    worksheet.column(8).setWidth(3);
    worksheet.column(9).setWidth(3);
    worksheet.column(10).setWidth(10);
    worksheet.column(11).setWidth(10);
    worksheet.column(12).setWidth(10);
    worksheet.column(13).setWidth(10);
    worksheet.column(14).setWidth(10);
    worksheet.column(15).setWidth(10);
    worksheet.column(16).setWidth(10);
    worksheet.column(17).setWidth(10);
    worksheet.column(18).setWidth(10);
    worksheet.column(19).setWidth(10);
    worksheet.column(20).setWidth(10);
    worksheet.column(21).setWidth(10);
    worksheet.column(22).setWidth(10);
    worksheet.column(23).setWidth(10);
    worksheet.column(24).setWidth(10);
    worksheet.column(25).setWidth(10);
    worksheet.column(26).setWidth(15);
    worksheet.column(27).setWidth(15);
    worksheet.column(28).setWidth(10);
    worksheet.column(29).setWidth(10);
    worksheet.column(30).setWidth(10);
    worksheet.column(31).setWidth(15);


    worksheet.cell(5, 1).string('Branch Name').style(header_style);
    worksheet.cell(5, 2).string('Prefix').style(header_style);
    worksheet.cell(5, 3).string('Code').style(header_style);
    worksheet.cell(5, 4).string('S. No').style(header_style);
    worksheet.cell(5, 5).string('Name').style(header_style);
    worksheet.cell(5, 6).string('Designation').style(header_style);
    worksheet.cell(5, 7).string('D').style(header_style);
    worksheet.cell(5, 8).string('L').style(header_style);
    worksheet.cell(5, 9).string('A').style(header_style);
    worksheet.cell(5, 10).string('Gross').style(header_style);
    worksheet.cell(5, 11).string('Basic Pay').style(header_style);
    worksheet.cell(5, 12).string('House Rent').style(header_style);
    worksheet.cell(5, 13).string('Medical').style(header_style);
    worksheet.cell(5, 14).string('Utilities').style(header_style);
    worksheet.cell(5, 15).string('Gross').style(header_style);
    worksheet.cell(5, 16).string('Adv').style(header_style);
    worksheet.cell(5, 17).string('Loan').style(header_style);
    worksheet.cell(5, 18).string('I. Tax').style(header_style);
    worksheet.cell(5, 19).string('Fine').style(header_style);
    worksheet.cell(5, 20).string('Others').style(header_style);
    worksheet.cell(5, 21).string('Bank').style(header_style);
    worksheet.cell(5, 22).string('Cash').style(header_style);
    worksheet.cell(5, 23).string('Allowance').style(header_style);
    worksheet.cell(5, 24).string('Bonus').style(header_style);
    worksheet.cell(5, 25).string('Bank/Cash').style(header_style);
    worksheet.cell(5, 26).string('Account No.').style(header_style);
    worksheet.cell(5, 27).string('Bank Address').style(header_style);
    worksheet.cell(5, 28).string('Branch Code').style(header_style);
    worksheet.cell(5, 29).string('D O J').style(header_style);
    worksheet.cell(5, 30).string('D O B').style(header_style);
    worksheet.cell(5, 31).string('CNIC').style(header_style);

    for (let index = 0; index < employees.length; index++) {
        const element = employees[index];


        worksheet.cell(6 + index, 1).string(element['employee']['employment_details']['unit']['name']).style(data_style);
        worksheet.cell(6 + index, 2).string('prefix' in element['employee']['employment_details']['unit'] ? element['employee']['employment_details']['unit']['prefix'] : '-').style(data_style);
        worksheet.cell(6 + index, 3).string(element['employee']['employment_details']['unit']['code']).style(data_style);
        worksheet.cell(6 + index, 4).string((index + 1).toString()).style(data_style);
        worksheet.cell(6 + index, 5).string(`${element['employee']['basic_details']['firstname']} ${element['employee']['basic_details']['lastname']}`).style(data_style);
        worksheet.cell(6 + index, 6).string('designation' in element['employee']['employment_details'] ? element['employee']['employment_details']['designation'] : '-').style(data_style);
        worksheet.cell(6 + index, 7).string(`${element['pay_details']['attendances']['total_days']}`).style(data_style);
        worksheet.cell(6 + index, 8).string(`${element['pay_details']['attendances']['total_days']}`).style(data_style);
        worksheet.cell(6 + index, 9).string(`${element['pay_details']['attendances']['total_days']}`).style(data_style);
        worksheet.cell(6 + index, 10).string(`${element['pay_details']['wage_details']['gross']}`).style(data_style);
        worksheet.cell(6 + index, 11).string(`${element['employee']['employment_details']['benefits']['basic_pay']}`).style(data_style);
        worksheet.cell(6 + index, 12).string(`${element['employee']['employment_details']['benefits']['house_rent']}`).style(data_style);
        worksheet.cell(6 + index, 13).string(`${element['employee']['employment_details']['benefits']['medical']}`).style(data_style);
        worksheet.cell(6 + index, 14).string(`${element['employee']['employment_details']['benefits']['utilites_all']}`).style(data_style);
        worksheet.cell(6 + index, 15).string(`${element['pay_details']['wage_details']['gross']}`).style(data_style);
        worksheet.cell(6 + index, 16).string(`${element['pay_details']['deductions']['advance']}`).style(data_style);
        worksheet.cell(6 + index, 17).string(`${element['pay_details']['deductions']['loan']}`).style(data_style);
        worksheet.cell(6 + index, 18).string(`-`).style(data_style);
        worksheet.cell(6 + index, 19).string(`${element['pay_details']['deductions']['fine']}`).style(data_style);
        worksheet.cell(6 + index, 20).string(`${element['pay_details']['deductions']['others']}`).style(data_style);
        worksheet.cell(6 + index, 21).string(element['payment_handler'] === 'b' ? `${element['pay_details']['wage_details']['net']}` : '-').style(data_style);
        worksheet.cell(6 + index, 22).string(element['payment_handler'] === 'c' ? `${element['pay_details']['wage_details']['net']}` : '-').style(data_style);
        worksheet.cell(6 + index, 23).string(`${element['pay_details']['additions']['allowance']}`).style(data_style);
        worksheet.cell(6 + index, 24).string(`${element['pay_details']['additions']['bonus']}`).style(data_style);
        worksheet.cell(6 + index, 25).string(element['payment_handler'] === 'c' ? `C` : 'A').style(data_style);
        worksheet.cell(6 + index, 26).string(element['payment_handler'] === 'b' ? `${element['employee']['employment_details']['account_details']['acc_number']}` : '-').style(data_style);
        worksheet.cell(6 + index, 27).string(element['payment_handler'] === 'b' ? `${element['employee']['employment_details']['account_details']['bank_name']} ${element['employee']['employment_details']['account_details']['branch']}` : '-').style(data_style);
        worksheet.cell(6 + index, 28).string(element['payment_handler'] === 'b' ? `${element['employee']['employment_details']['account_details']['acc_number'].split("-")[0]}` : '-').style(data_style);
        worksheet.cell(6 + index, 29).string(`${element['employee']['employment_details']['joining_date']}`).style(data_style);
        worksheet.cell(6 + index, 30).string(`${element['employee']['basic_details']['dob']}`).style(data_style);
        worksheet.cell(6 + index, 31).string(`${element['employee']['basic_details']['cnic']}`).style(data_style);

    }




    workbook.write(report_path);
}

export function generateBranchPayroll(report_path, branch_data) {

    let workbook = new xl.Workbook();
    let worksheet = workbook.addWorksheet('branch-payroll');

    const data_style = workbook.createStyle({

        font: {
            size: 12
        },
        alignment: {
            shrinkToFit: false
        }
    });

    const header_style = workbook.createStyle({

        font: {
            size: 10,
            /* bold: true, */
        },
        fill: {
            type: 'pattern', // the only one implemented so far.
            patternType: 'solid', // most common.
            fgColor: 'bfbfbf', // you can add two extra characters to serve as alpha, i.e. '2172d7aa'.

        },
        alignment: {
            shrinkToFit: false,
            horizontal: 'center'
        },
        border: {

            right: {
                style: 'medium',
                color: '000000'
            },
            left: {
                style: 'medium',
                color: '000000'
            },
            top: {
                style: 'medium',
                color: '000000'
            },
            bottom: {
                style: 'medium',
                color: '000000'
            }
        }
    });

    worksheet.column(1).setWidth(5);
    worksheet.column(2).setWidth(10);
    worksheet.column(3).setWidth(25);
    worksheet.column(4).setWidth(10).freeze();
    worksheet.column(5).setWidth(12);
    worksheet.column(6).setWidth(10);
    worksheet.column(7).setWidth(10);
    worksheet.column(8).setWidth(10);
    worksheet.column(9).setWidth(10);
    worksheet.column(10).setWidth(12);
    worksheet.column(11).setWidth(12);
    worksheet.column(12).setWidth(12);
    worksheet.column(13).setWidth(12);
    worksheet.column(14).setWidth(12);

    worksheet.cell(1, 1).string('S. No').style(header_style);
    worksheet.cell(1, 2).string('Prefix').style(header_style);
    worksheet.cell(1, 3).string('Branch Name').style(header_style);
    worksheet.cell(1, 4).string('Code').style(header_style);
    worksheet.cell(1, 5).string('Salary').style(header_style);
    worksheet.cell(1, 6).string('Adv.').style(header_style);
    worksheet.cell(1, 7).string('Loan').style(header_style);
    worksheet.cell(1, 8).string('I.Tax').style(header_style);
    worksheet.cell(1, 9).string('Fine').style(header_style);
    worksheet.cell(1, 10).string('Others').style(header_style);
    worksheet.cell(1, 11).string('Bank').style(header_style);
    worksheet.cell(1, 12).string('Cash').style(header_style);
    worksheet.cell(1, 13).string('Bonus').style(header_style);
    worksheet.cell(1, 14).string('Total').style(header_style);


    for (let index = 0; index < branch_data.length; index++) {
        const element = branch_data[index];


        worksheet.cell(3 + index, 1).string((index + 1).toString());
        worksheet.cell(3 + index, 2).string('prefix' in element['unit'] ? element['unit']['prefix'] : '-').style(data_style);
        worksheet.cell(3 + index, 3).string(element['unit']['name']).style(data_style);
        worksheet.cell(3 + index, 4).string(element['unit']['code']).style(data_style);
        worksheet.cell(3 + index, 5).string(`${element['salaries']}`).style(data_style);
        worksheet.cell(3 + index, 6).string(`${element['advances']}`).style(data_style);
        worksheet.cell(3 + index, 7).string(`${element['loans']}`).style(data_style);
        worksheet.cell(3 + index, 8).string(`-`).style(data_style);
        worksheet.cell(3 + index, 9).string(`${element['fines']}`).style(data_style);
        worksheet.cell(3 + index, 10).string(`${element['others']}`).style(data_style);
        worksheet.cell(3 + index, 11).string(`-`).style(data_style);
        worksheet.cell(3 + index, 12).string(`-`).style(data_style);
        worksheet.cell(3 + index, 13).string(`${element['bonuses']}`).style(data_style);
        worksheet.cell(3 + index, 14).string(`${element['total']}`).style(data_style);

    }


    workbook.write(report_path);


}

export function generateMonthlyAllowancePayroll(report_path, allowance_details, payroll_details, total_allowances_amount, unit = {}) {


    let workbook = new xl.Workbook();
    let worksheet = workbook.addWorksheet(`allowance`);
    let branch_name = Object.keys(unit).length === 0 ? 'All' : unit['name'];

    const headline_style = workbook.createStyle({

        font: {

            size: 10,
            bold: true
        },
        alignment: {
            shrinkToFit: true,
            wrapText: true
        }

    });


    const data_style = workbook.createStyle({

        font: {
            size: 8
        },
        alignment: {
            shrinkToFit: false
        }
    });

    worksheet.column(1).setWidth(5);
    worksheet.column(2).setWidth(15);
    worksheet.column(3).setWidth(12);
    worksheet.column(4).setWidth(12);
    /* Headlines */
    worksheet.cell(1, 1, 1, 4, true).string('M/s Muhammadi Currency Exchange Company (Pvt.) Ltd.').style(headline_style);
    worksheet.cell(2, 1, 2, 4, true).string(`Branch: ${branch_name}`).style({ font: { size: 10 } });
    worksheet.cell(3, 1, 3, 4, true).string('Allowance Sheet').style({ font: { size: 10 } });
    worksheet.cell(4, 1, 4, 4, true).string(`For The Month of ${payroll_details['for_month']['month']}-${payroll_details['for_month']['year']}`).style({ font: { size: 10 } });

    const header_style = workbook.createStyle({

        font: {
            size: 7,
            bold: true,
        },
        /* fill:{
            bgColor: '#dddddd'
        }, */
        fill: {
            type: 'pattern', // the only one implemented so far.
            patternType: 'solid', // most common.
            fgColor: 'dddddd', // you can add two extra characters to serve as alpha, i.e. '2172d7aa'.

        },
        alignment: {
            shrinkToFit: false,
            horizontal: 'center'
        }
    });


    worksheet.cell(5, 1).string('S. No').style(header_style);
    worksheet.cell(5, 2).string('Name').style(header_style);
    worksheet.cell(5, 3).string('Designation').style(header_style);
    worksheet.cell(5, 4).string('Allowance').style(header_style);


    for (let index = 0; index < allowance_details.length; index++) {
        const element = allowance_details[index];

        worksheet.cell(6 + index, 1).string((index + 1).toString()).style(data_style);
        worksheet.cell(6 + index, 2).string(`${element['employee']['basic_details']['firstname']} ${element['employee']['basic_details']['lastname']}`).style(data_style);
        worksheet.cell(6 + index, 3).string('designation' in element['employee']['employment_details'] ? element['employee']['employment_details']['designation'] : '-').style(data_style);
        worksheet.cell(6 + index, 4).string(`${element['pay_details']['additions']['allowance']}`).style(data_style);


        if (index === allowance_details.length - 1) {

            worksheet.cell(8 + index, 4).string(`${total_allowances_amount}`).style({
                font: {
                    size: 10,
                    bold: true,

                },
                border: {
                    top: {
                        style: 'medium',
                        color: '000000'
                    },
                    bottom: {
                        style: 'medium',
                        color: '000000'
                    }
                }
            });

        }

    }

    workbook.write(report_path);


}


export function generateEmployeesLeft(report_path, employees) {


    let workbook = new xl.Workbook();
    let worksheet = workbook.addWorksheet(`left`);

    const data_style = workbook.createStyle({

        font: {
            size: 8
        },
        alignment: {
            shrinkToFit: false
        }
    });

    const header_style = workbook.createStyle({

        font: {
            size: 7,
            bold: true,
        },
        /* fill:{
            bgColor: '#dddddd'
        }, */
        fill: {
            type: 'pattern', // the only one implemented so far.
            patternType: 'solid', // most common.
            fgColor: 'dddddd', // you can add two extra characters to serve as alpha, i.e. '2172d7aa'.

        },
        alignment: {
            shrinkToFit: false,
            horizontal: 'center'
        }
    });

    worksheet.column(1).setWidth(18);
    worksheet.column(2).setWidth(10);
    worksheet.column(3).setWidth(10);
    worksheet.column(4).setWidth(5);
    worksheet.column(5).setWidth(28);
    worksheet.column(6).setWidth(12);
    worksheet.column(7).setWidth(10);
    worksheet.column(8).setWidth(10);
    worksheet.column(9).setWidth(10);
    worksheet.column(10).setWidth(10);
    worksheet.column(11).setWidth(10);
    worksheet.column(12).setWidth(10);
    worksheet.column(13).setWidth(10);
    worksheet.column(14).setWidth(10);
    worksheet.column(15).setWidth(10);
    worksheet.column(16).setWidth(10);
    worksheet.column(17).setWidth(10);
    worksheet.column(18).setWidth(10);
    worksheet.column(19).setWidth(10);
    worksheet.column(20).setWidth(10);
    worksheet.column(21).setWidth(10);
    worksheet.column(22).setWidth(10);
    worksheet.column(23).setWidth(10);
    worksheet.column(24).setWidth(10);
    worksheet.column(25).setWidth(10);
    worksheet.column(26).setWidth(15);
    worksheet.column(27).setWidth(15);
    worksheet.column(28).setWidth(10);
    worksheet.column(29).setWidth(10);
    worksheet.column(30).setWidth(10);
    worksheet.column(31).setWidth(15);

    worksheet.cell(1, 1).string('Branch Name').style(header_style);
    worksheet.cell(1, 2).string('Prefix').style(header_style);
    worksheet.cell(1, 3).string('Code').style(header_style);
    worksheet.cell(1, 4).string('S. No').style(header_style);
    worksheet.cell(1, 5).string('Name').style(header_style);
    worksheet.cell(1, 6).string('Designation').style(header_style);
    worksheet.cell(1, 7).string('Gross').style(header_style);
    worksheet.cell(1, 8).string('Basic Pay').style(header_style);
    worksheet.cell(1, 9).string('House Rent').style(header_style);
    worksheet.cell(1, 10).string('Medical').style(header_style);
    worksheet.cell(1, 11).string('Utilities').style(header_style);
    worksheet.cell(1, 12).string('Gross').style(header_style);
    worksheet.cell(1, 13).string('Adv').style(header_style);
    worksheet.cell(1, 14).string('Loan').style(header_style);
    worksheet.cell(1, 15).string('I. Tax').style(header_style);
    worksheet.cell(1, 16).string('Fine').style(header_style);
    worksheet.cell(1, 17).string('Others').style(header_style);
    worksheet.cell(1, 18).string('Bank').style(header_style);
    worksheet.cell(1, 19).string('Cash').style(header_style);
    worksheet.cell(1, 20).string('Allowance').style(header_style);
    worksheet.cell(1, 21).string('Bonus').style(header_style);
    worksheet.cell(1, 22).string('Bank/Cash').style(header_style);
    worksheet.cell(1, 23).string('Account No.').style(header_style);
    worksheet.cell(1, 24).string('Bank Address').style(header_style);
    worksheet.cell(1, 25).string('Branch Code').style(header_style);
    worksheet.cell(1, 26).string('D O J').style(header_style);
    worksheet.cell(1, 27).string('D O B').style(header_style);
    worksheet.cell(1, 28).string('CNIC').style(header_style);
    worksheet.cell(1, 29).string('Duration').style(header_style);

    for (let index = 0; index < employees.length; index++) {
        const element = employees[index];


        worksheet.cell(2 + index, 1).string(element['employment_details']['unit']['name']).style(data_style);
        worksheet.cell(2 + index, 2).string('prefix' in element['employment_details']['unit'] ? element['employment_details']['unit']['prefix'] : '-').style(data_style);
        worksheet.cell(2 + index, 3).string(element['employment_details']['unit']['code']).style(data_style);
        worksheet.cell(2 + index, 4).string((index + 1).toString()).style(data_style);
        worksheet.cell(2 + index, 5).string(`${element['basic_details']['firstname']} ${element['basic_details']['lastname']}`).style(data_style);
        worksheet.cell(2 + index, 6).string('designation' in element['employment_details'] ? element['employment_details']['designation'] : '-').style(data_style);
        worksheet.cell(2 + index, 7).string(`${element['employment_details']['salary']}`).style(data_style);
        worksheet.cell(2 + index, 8).string(`${element['employment_details']['benefits']['basic_pay']}`).style(data_style);
        worksheet.cell(2 + index, 9).string(`${element['employment_details']['benefits']['house_rent']}`).style(data_style);
        worksheet.cell(2 + index, 10).string(`${element['employment_details']['benefits']['medical']}`).style(data_style);
        worksheet.cell(2 + index, 11).string(`${element['employment_details']['benefits']['utilites_all']}`).style(data_style);
        worksheet.cell(2 + index, 12).string(`${element['employment_details']['salary']}`).style(data_style);
        worksheet.cell(2 + index, 13).string(`-`).style(data_style);
        worksheet.cell(2 + index, 14).string(`-`).style(data_style);
        worksheet.cell(2 + index, 15).string(`-`).style(data_style);
        worksheet.cell(2 + index, 16).string(`-`).style(data_style);
        worksheet.cell(2 + index, 17).string(`-`).style(data_style);
        worksheet.cell(2 + index, 18).string(`-`).style(data_style);
        worksheet.cell(2 + index, 19).string(`-`).style(data_style);
        worksheet.cell(2 + index, 20).string(`-`).style(data_style);
        worksheet.cell(2 + index, 21).string(`-`).style(data_style);
        worksheet.cell(2 + index, 22).string(`-`).style(data_style);
        worksheet.cell(2 + index, 23).string(`-`).style(data_style);
        worksheet.cell(2 + index, 24).string(`-`).style(data_style);
        worksheet.cell(2 + index, 25).string(`-`).style(data_style);
        worksheet.cell(2 + index, 26).string(`-`).style(data_style);
        worksheet.cell(2 + index, 27).string(`-`).style(data_style);
        worksheet.cell(2 + index, 28).string(`-`).style(data_style);
        worksheet.cell(2 + index, 29).string(`-`).style(data_style);

    }




    workbook.write(report_path);

}

export function getAttendanceType(attendance_type) {

    if (attendance_type == ATTENDANCE_TYPES[0]) {
        return 'P';
    }
    else if (attendance_type == ATTENDANCE_TYPES[1]) {
        return 'LA';
    }
    else if (attendance_type == ATTENDANCE_TYPES[2]) {
        return 'H';
    }
    else if (attendance_type == ATTENDANCE_TYPES[3]) {
        return 'LE';
    }
    else if (attendance_type == ATTENDANCE_TYPES[4]) {
        return 'A';
    }
}