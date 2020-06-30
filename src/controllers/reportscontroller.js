import { parseBody, generateResponse, getReportFilePath, calculateDurationBetweenDates } from '../utilites';
import _ from 'lodash';
import mongoose from 'mongoose';
import Unit from '../models/unit';
import Payroll from '../models/payroll';
import EmployeePayment from '../models/employeepayment';
import EmployeeLoan from '../models/employeeloan';
import Employee from '../models/employee';
import { generateBranchListing, generatePayroll, generateBranchPayroll, generateMonthlyAllowancePayroll, generateEmployeesLeft } from '../utilites/report-generator-module';
import config from '../conf';
import moment from 'moment';
import { EMPLOYEE_STATUS } from '../utilites/constants';


export async function branchListingReport(req, res) {


    let body = parseBody(req);
    const extension = 'xlsx';
    const filename = "branches"
    let report_url = getReportFilePath(filename, extension);
    let report_path = `${config.app['file_path']}reports/${filename}.${extension}`;
    console.log(report_url);

    Unit.getUnit({}, async (err, units) => {

        if (err) {
            throw err;
        }

        await generateBranchListing(units, report_path);
        generateResponse(true, "Branch listing report generated successfully", report_url, res);

    });
}

export async function payrollReport(req, res) {

    try {

        let body = parseBody(req);
        const extension = 'xlsx';

        let payroll_details = await Payroll.getSpecificPayroll({ _id: body['payroll'] });
        payroll_details = payroll_details[0];
        const filename = `${payroll_details['for_month']['month']}-${payroll_details['for_month']['year']}`;
        let report_url = getReportFilePath(filename, extension);
        let report_path = `${config.app['file_path']}reports/${filename}.${extension}`;

        let payrollEmployees = await EmployeePayment.getEmployeePayments({ 'payroll': body['payroll'] });
        //By Transfer
        payrollEmployees = _.map(payrollEmployees, (e) => {

            e['pay_details']['deductions']['others'] = e['pay_details']['deductions']['absents'] + e['pay_details']['deductions']['short_times']

            if (e['employee']['employment_details']['payment_type'] === 'By Transfer') {

                e['payment_handler'] = "b"
                return e;
            }
            else {

                e['payment_handler'] = "c"
                return e;
            }

        })




        await generatePayroll(report_path, payroll_details, payrollEmployees);
        generateResponse(true, "Payroll report generated successfully", report_url, res);

    }
    catch (e) {

        console.log(e);
        generateResponse(false, "Unable to generate report", null, res);

    }



}

export async function branchSalaryReport(req, res) {


    try {
        let body = parseBody(req);
        let payroll_details = await Payroll.getSpecificPayroll({ _id: body['payroll'] });
        payroll_details = payroll_details[0];
        const filename = `branch-payroll-${payroll_details['for_month']['month']}-${payroll_details['for_month']['year']}`;

        let pipeline = [
            {
                $match: {
                    'payroll': mongoose.Types.ObjectId(body['payroll']),
                }
            },
            {
                $lookup: {
                    "from": 'employees',
                    "localField": "employee",
                    "foreignField": "_id",
                    "as": "employee"
                }
            },
            { $unwind: "$employee" },
            {
                $lookup: {
                    "from": 'units',
                    "localField": "employee.employment_details.unit",
                    "foreignField": "_id",
                    "as": "unit",
                }
            },
            { $unwind: "$unit" },
            { $unwind: "$pay_details" },
            { $unwind: "$pay_details.wage_details" },
            { $unwind: "$pay_details.deductions" },
            { $unwind: "$pay_details.additions" },
            {
                $group: {
                    "_id": '$employee.employment_details.unit',
                    "unit": { $push: "$unit" }, "count": { $sum: 1 },
                    "salaries": { $sum: "$pay_details.wage_details.net" },

                    /* Deductions */
                    "advances": { $sum: "$pay_details.deductions.advance" },
                    "loans": { $sum: "$pay_details.deductions.loan" },
                    "income_tax": { $sum: "$pay_details.deductions.tax" },
                    "fines": { $sum: "$pay_details.deductions.fine" },
                    "short_times": { $sum: "$pay_details.deductions.short_times" },
                    "absents": { $sum: "$pay_details.deductions.absents" },
                    /* Additions */
                    "bonuses": { $sum: "$pay_details.additions.bonus" }
                }
            },
            {
                $project: {
                    "_id": 0,
                    "unit": 1,
                    "count": 1,
                    "salaries": 1,
                    "advances": 1,
                    "loans": 1,
                    "income_tax": 1,
                    "fines": 1,
                    "others": { $add: ['$absents', '$short_times'] },
                    "bonuses": 1,
                    "additions": {
                        $add: ["$salaries", "$bonuses"]
                    },
                    "deductions": {
                        $add: ["$advances", "$loans", "$income_tax", "$fines", "$short_times", "$absents"]
                    }
                }
            },
        ];

        let branchData = await EmployeePayment.aggregate(pipeline);

        branchData = _.map(branchData, (d) => {

            d['unit'] = d['unit'][0]
            d['total'] = d['additions'] - d['deductions'];
            return d;
        });

        const extension = 'xlsx';
        let report_url = getReportFilePath(filename, extension);
        let report_path = `${config.app['file_path']}reports/${filename}.${extension}`;

        await generateBranchPayroll(report_path, branchData);


        generateResponse(true, "Branch Payroll Generated Successfully", report_url, res);
    }
    catch (e) {
        console.log(e);
        generateResponse(false, "Unable to generate report", null, res);

    }
}


export async function loanReport(req, res) {

    try {

        let body = parseBody(req);
        let from_date = body['from'];
        let to_date = body['to'];
        console.log(from_date, to_date);
        let start = from_date.split("-")
        let startYear = start[0]
        let end = to_date.split("-");
        let endYear = end[0]

        let dates = [];

        for (let i = startYear; i <= endYear; i++) {
            let endMonth = i != endYear ? 11 : parseInt(end[1]) - 1;
            let startMon = i === startYear ? parseInt(start[1]) - 1 : 0;
            for (let j = startMon; j <= endMonth; j = j > 12 ? j % 12 || 11 : j + 1) {
                /* let month = j+1;
                let displayMonth = month < 10 ? '0'+month : month;
                dates.push([i, displayMonth].join('-')); */
                let month = j;
                let displayMonth = month;
                dates.push(
                    {
                        month: displayMonth,
                        year: i
                    }
                );

            }
        }



        /* let pipeline = [
            { $unwind : "$return_amount_logs" },
            { $match : }

        ]; */

        //let loans = await EmployeeLoan.aggregate(pipeline);


        generateResponse(false, "Loan report generated successfully", dates, res);

    }
    catch (e) {

        console.log(e);
        generateResponse(false, "Unable to generate report", null, res);

    }


}

export async function employeeAllowanceReport(req, res) {

    try {

        let body = parseBody(req);
        const extension = 'xlsx';

        let payroll_details = await Payroll.getSpecificPayroll({ _id: body['payroll'] });
        payroll_details = payroll_details[0];
        const filename = `allowances-${payroll_details['for_month']['month']}-${payroll_details['for_month']['year']}`;
        let report_url = getReportFilePath(filename, extension);
        let report_path = `${config.app['file_path']}reports/${filename}.${extension}`;

        let pipeline = [];
        let unit = {};


        if (body['unit'] === '') {

            pipeline = [
                {
                    $match: {
                        'payroll': mongoose.Types.ObjectId(body['payroll']),
                    }
                },
                {
                    $lookup: {
                        "from": 'employees',
                        "localField": "employee",
                        "foreignField": "_id",
                        "as": "employee"
                    }
                },
                { $unwind: "$employee" },
                {
                    $lookup: {
                        "from": 'units',
                        "localField": "employee.employment_details.unit",
                        "foreignField": "_id",
                        "as": "unit",
                    }
                },
                { $unwind: "$unit" },
                { $unwind: "$pay_details" },
                { $unwind: "$pay_details.additions" },
                {
                    $project: {
                        /*  "_id": 0, */
                        "employee": 1,
                        "unit": 1,
                        "pay_details.additions.allowance": 1,
                    }
                }
            ];


        }
        else {

            console.log(body['unit']);

            let unit_details = await Unit.getSpecificUnit({ _id: body['unit'] });
            unit = unit_details[0];

            pipeline = [
                {
                    $match: {
                        'payroll': mongoose.Types.ObjectId(body['payroll']),
                    }
                },
                {
                    $lookup: {
                        "from": 'employees',
                        "localField": "employee",
                        "foreignField": "_id",
                        "as": "employee"
                    }
                },
                { $unwind: "$employee" },
                {
                    $lookup: {
                        "from": 'units',
                        "localField": "employee.employment_details.unit",
                        "foreignField": "_id",
                        "as": "unit",
                    }
                },
                { $unwind: "$unit" },
                {
                    $match: {
                        'unit._id': mongoose.Types.ObjectId(body['unit']),
                    }
                },
                { $unwind: "$pay_details" },
                { $unwind: "$pay_details.additions" },
                {
                    $project: {
                        "employee": 1,
                        "unit": 1,
                        "pay_details.additions.allowance": 1,
                    }
                }
            ];

        }



        let allowances = await EmployeePayment.aggregate(pipeline);


        let total_allowances_amount = _.reduce(allowances, (acc, obj) => {

            return acc + obj['pay_details']['additions']['allowance'];


        }, 0);

        console.log(total_allowances_amount);

        await generateMonthlyAllowancePayroll(report_path, allowances, payroll_details, total_allowances_amount, unit);
        generateResponse(true, "Employee allowance report generated successfully", report_url, res);

    }
    catch (e) {

        console.log(e);
        generateResponse(false, "Unable to generate report", null, res);

    }


}

export async function leftOverEmployeesReport(req, res) {

    try {

        let body = parseBody(req);
        const filename = `employees-left`;
        const extension = 'xlsx';
        let report_url = getReportFilePath(filename, extension);
        let report_path = `${config.app['file_path']}reports/${filename}.${extension}`;


        let employees = await Employee.getSpecificEmployeeV2({'status.is_activated' : EMPLOYEE_STATUS[2]});

        _.map(employees, (e)=>{

            if(e['employment_details']['joining_date'] !== null || e['employment_details']['quit_date'] !== null){
                console.log("IF");

                let joining_date = new Date(e['employment_details']['joining_date']);
                let quit_date = new Date(e['employment_details']['quit_date']);

                let duration = calculateDurationBetweenDates(joining_date, quit_date)


                return e['employment_duration'] = `${duration}`;

            }
            else{
                console.log("ELSE");
                return e['employment_duration'] = "-"

            }


        });

        await generateEmployeesLeft(report_path, employees);
        
        generateResponse(false, "Left employees report generated successfully", report_url, res);

    }
    catch (e) {

        console.log(e);
        generateResponse(false, "Unable to generate report", null, res);

    }

}