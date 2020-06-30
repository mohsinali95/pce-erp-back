import { parseBody, generateResponse, enumerateDaysBetweenDates, processSalary, calculateDurationBetweenDates } from '../utilites';
import { LOAN_STATUS, EMPLOYEE_STATUS, FINE_STATUS, ADVANCE_STATUS, SYSTEM_EMPLOYEES } from '../utilites/constants';
import mongoose from 'mongoose';
import Employee from '../models/employee';
import EmployeeAttendance from '../models/employeeattendance';
import EmployeeLoan from '../models/employeeloan';
import EmployeeFine from '../models/employeefine';
import EmployeeAdvance from '../models/employeeadvance';
import EmployeePayment from '../models/employeepayment';
import Payroll from '../models/payroll';
import _ from 'lodash';


export async function processPayroll(req, res) {

    try {

        let body = parseBody(req);
        let employees = body['employees'];
        /* console.log(employees); */
        let payroll_start_date = new Date(body['start_date']);
        let payroll_end_date = new Date(body['end_date'])
        let payroll_month = payroll_end_date.getMonth();
        let payroll_year = payroll_end_date.getFullYear();

        let payroll_id = `${payroll_month}-${payroll_year}-${body['payroll_name']}`;

        let createdPayrolls = await Payroll.getPayrolls({ payroll_id });

        console.log('is found', createdPayrolls);

        if (createdPayrolls.length > 0) {

            generateResponse(false, "payroll id already exist, please change payroll name", null, res);

        }
        else {

            let dates = enumerateDaysBetweenDates(new Date(body['start_date']), new Date(body['end_date']));

            let attendanceDateStringArray = _.map(dates, ele => {

                let tempDate = `${ele.getFullYear().toString()}-${parseInt(ele.getMonth() + 1)}-${ele.getDate()}`
                return tempDate;

            });


            let isPayrollExist = await checkIfPayrollExistForEmployee(employees, payroll_month, payroll_year)

            if (isPayrollExist['is_found']) {

                generateResponse(false, "employees payroll already exist", isPayrollExist['employees'], res);

            }
            else {

                let employeeAttendances = await getAttendanceTypes(employees, attendanceDateStringArray);

                if (employees.length > 0) {



                    Promise.all(
                        employees.map(async (employee_id) => {

                            let employee = await Employee.getSpecificEmployeeV2({ _id: employee_id, 'status.is_activated': EMPLOYEE_STATUS[1] }, 'basic_details employment_details benefits_details')
                            if (employee.length > 0) {

                                employee = employee[0];
                                /* console.log(employee); */
                                let employee_number = employee['employment_details']['employee_number'];
                                let salary = processSalary(employee['employment_details']['salary'])

                                let employeeAttendance = employeeAttendances.filter(obj => {
                                    return obj['employee_number'] === employee_number;
                                });
                                employeeAttendance = employeeAttendance[0];
                                /* Deductions Amount */
                                let absentDeductionAmount = calculateAbsentOrUndefineAmounts(employeeAttendance, salary, dates.length);
                                let employeeLoans = await calculateLoans(employee_id, payroll_month, payroll_year);
                                let fineObj = await calculateFines(employee_id);
                                let advanceObj = await calculateAdvance(employee_id);

                                /* Additions Amount */
                                let allowanceObj = calculateAllowances(employee['benefits_details']);
                                let gratuityObj = calculateGratuityAmount(salary, employee['employment_details']['joining_date'], payroll_start_date)

                                let payroll = {

                                    employee_id: employee_id,
                                    gross_salary: salary,
                                    net_salary: 0,
                                    include_gratuity: gratuityObj['include_gratuity'],
                                    employee_number: employee_number,
                                    loans: employeeLoans['loans'],
                                    attendances: employeeAttendance,
                                    allowances: allowanceObj['allowances'],
                                    fines: fineObj['fines'],
                                    advances: advanceObj['advances'],
                                    bonuses: [],
                                    deductions: {
                                        absents: absentDeductionAmount,
                                        loan: employeeLoans['loanTotal'],
                                        advance: advanceObj['advance_amount'],
                                        short_times: 0,
                                        tax: 0,
                                        fine: fineObj['total_fine'],
                                    },
                                    additions: {
                                        allowance: allowanceObj['total_allowance_amount'],
                                        gratuity: gratuityObj['gratuity'],
                                        bonus: 0
                                    }
                                };
                                payroll['net_salary'] = calculateNetAmount(payroll['deductions'], payroll['additions'], salary);
                                return payroll;

                            }
                        })
                    ).then((payrollResults) => {


                        payrollResults = payrollResults.filter((ele) => {

                            return typeof ele !== 'undefined';

                        });
                        generateResponse(true, 'payroll processed successfully', payrollResults, res);
                    });

                }
                else {

                    let query = {
                        'status.is_activated': EMPLOYEE_STATUS[1],
                        'employment_details.employee_number': { $nin: SYSTEM_EMPLOYEES }
                    };

                    let employees = await Employee.getSpecificEmployeeV2(query, 'basic_details employment_details benefits_details');
                    Promise.all(
                        employees.map(async (employee) => {
                            let employee_number = employee['employment_details']['employee_number'];
                            let employee_id = employee['_id'];
                            let salary = processSalary(employee['employment_details']['salary']);

                            let employeeAttendance = employeeAttendances.filter(obj => {
                                return obj['employee_number'] === employee_number;
                            });
                            employeeAttendance = employeeAttendance[0];

                            /* Deductions Amount */
                            let absentDeductionAmount = calculateAbsentOrUndefineAmounts(employeeAttendance, salary, dates.length);
                            let employeeLoans = await calculateLoans(employee_id, payroll_month, payroll_year);
                            let fineObj = await calculateFines(employee_id);
                            let advanceObj = await calculateAdvance(employee_id);

                            /* Additions Amount */
                            let allowanceObj = calculateAllowances(employee['benefits_details']);
                            let gratuityObj = calculateGratuityAmount(salary, employee['employment_details']['joining_date'], payroll_start_date)

                            let payroll = {

                                employee_id: employee_id,
                                gross_salary: salary,
                                net_salary: 0,
                                include_gratuity: gratuityObj['include_gratuity'],
                                employee_number: employee_number,
                                loans: employeeLoans['loans'],
                                attendances: employeeAttendance,
                                allowances: allowanceObj['allowances'],
                                fines: fineObj['fines'],
                                advances: advanceObj['advances'],
                                bonuses: [],
                                deductions: {
                                    absents: absentDeductionAmount,
                                    loan: employeeLoans['loanTotal'],
                                    advance: advanceObj['advance_amount'],
                                    short_times: 0,
                                    tax: 0,
                                    fine: fineObj['total_fine'],
                                },
                                additions: {
                                    allowance: allowanceObj['total_allowance_amount'],
                                    gratuity: gratuityObj['gratuity'],
                                    bonus: 0
                                }
                            };





                            payroll['net_salary'] = calculateNetAmount(payroll['deductions'], payroll['additions'], salary);

                            //console.log(payroll['net_salary'], payroll['gross_salary']);


                            return payroll;

                        })
                    ).then(
                        (payrollResults) => {


                            payrollResults = payrollResults.filter((ele) => {

                                return typeof ele !== 'undefined';

                            });
                            generateResponse(true, 'payroll processed successfully', payrollResults, res);
                        }
                    )

                }


            }

        }



    } catch (error) {

        console.log(error);
        generateResponse(false, 'unable to process payroll', null, res);

    }



}

export async function createNewPayroll(req, res) {

    try {

        let body = parseBody(req);

        /* Extract Data From Request */

        let payrolls = body['payrolls'];
        let payroll_start_date = new Date(body['start_date']);
        let payroll_end_date = new Date(body['end_date'])
        let payroll_month = payroll_end_date.getMonth();
        let payroll_year = payroll_end_date.getFullYear();

        /* Create Payroll */
        let payroll = {

            start_date: payroll_start_date,
            end_date: payroll_end_date,
            payroll_name: body['payroll_name'],
            payroll_id: `${payroll_month}-${payroll_year}-${body['payroll_name']}`,
            for_month: {
                month: payroll_month,
                year: payroll_year

            }

        }

        /* Query For Payroll Insertation */

        let createdPayroll = await Payroll.createPayroll(payroll);
        /* Payments Data Process and Deductions */
        Promise.all(
            _.map(payrolls, async (payrollObj) => {

                let attendances = {
                    attendance_types: payrollObj['attendances']['attendance_types'],
                    total_days: payrollObj['attendances']['total_days'],
                };

                /* Deductions */
                let advances = await deductAdvance(payrollObj['advances'], payroll_end_date);
                let fines = await deductFine(payrollObj['fines'], payroll_end_date);
                let loans = await deductLoan(payrollObj['loans'], payroll_end_date);

                console.log('advancesArray', advances);
                console.log('AllowancesArray', payrollObj['allowances']);
                console.log('BonusesArray', payrollObj['bonuses'])
                console.log('FinesArray', fines);
                console.log('Attedances', attendances);
                console.log("LoanArray", loans);
                console.log("---------------------------------------------");

                let employee_payment = {
                    employee: payrollObj['employee_id'],
                    payroll: createdPayroll['_id'],
                    pay_details: {

                        include_gratuity: payrollObj['include_gratuity'],
                        attendances: attendances,
                        working_details: {
                            total_time: 0,
                            given_time: 0
                        },
                        wage_details: {
                            gross: payrollObj['gross_salary'],
                            net: payrollObj['net_salary'],
                        },
                        deductions: payrollObj['deductions'],
                        additions: payrollObj['additions'],
                        bonuses: payrollObj['bonuses'],
                        allowances: payrollObj['allowances'],
                        fines: fines,
                        advances: advances,
                        loans: loans,
                    }
                };

                return employee_payment;



            })
        ).then(async (employee_payments) => {

            /* Insert Payment Data w.r.t Payrolls in Bulk */

            let createPayments = await EmployeePayment.addManyEmployeePayments(employee_payments);

            /* Process Data to Return */

            Promise.all(_.map(employee_payments, async (e) => {

                /* Specific Employee Details */

                let employee_details = await Employee.getSpecificEmployeeV2({ _id: e['employee'] }, 'basic_details employment_details');
                employee_details = employee_details[0];

                /* Loan Deduction and Total Amount */

                let loanPipeline = [
                    {
                        $match: {
                            'employee': mongoose.Types.ObjectId(e['employee']),
                            'loan_status': LOAN_STATUS['active'],
                        }
                    },
                    {
                        $group: {
                            '_id': null, 'total_loan': { $sum: "$loan_amount.total" }, 'paid_loan': { $sum: "$loan_amount.paid" }
                        }
                    },
                    {
                        $project: { _id: 0, 'total_loan': 1, 'paid_loan': 1 }
                    }
                ];

                let loan_details = await EmployeeLoan.aggregate(loanPipeline);


                let pay_dates = {

                    payroll_start_date,
                    payroll_end_date

                }


                return {
                    employee_payment: e,
                    employee_details,
                    loan_details,
                    pay_dates

                }


            })).then((data) => {


                generateResponse(true, 'payrolls payments updated succesfully', data, res);


            }, (error) => {

                console.log(error);

                generateResponse(false, 'unable to update payments', null, res);

            });

        }, (error) => {

            console.log(error);

            generateResponse(false, 'unable to create payroll', null, res);

        });

    } catch (error) {

        console.log(error);
        generateResponse(false, 'unable to create payload', null, res);

    }


}

export async function getPayrolls(req, res) {

    let queryParams = {

        page: req.query.page || 1,
        limit: req.query.limit || 1000,
        sort: req.query.sort,
        sortby: req.query.sortby,
        
    };



    let payrolls = await Payroll.getPayrolls(queryParams, 'employee.basic_details');
    let count = await Payroll.countPayrolls(queryParams);

    if (count != 0) {
        let data = {
            payrolls: payrolls,
            current: queryParams.page,
            pages: Math.ceil(count / queryParams.limit),
            totalrecords: count
        }
        generateResponse(true, "employee payrolls fetched successfully", data, res);
    }
    else {

        let data = {
            payrolls: payrolls,
            current: queryParams.page,
            pages: queryParams.page,
            totalrecords: count
        }
        generateResponse(true, "employee payrolls fetched successfully", data, res);
    }
    


}

/* General Functions */


async function checkIfPayrollExistForEmployee(employees, payroll_month, payroll_year) {


    let payrolls = await Payroll.getPayrolls({ month: payroll_month, year: payroll_year });
    let userPayrollResult = {

        is_found: false,
        employees: []

    };

    if (payrolls.length === 0) {

        userPayrollResult = {

            is_found: false,
            employees: []

        };

        return userPayrollResult;

    }
    else {

        let payroll_ids = _.map(payrolls, (p) => {

            return p['_id'];

        });

        /* console.log(payroll_ids); */

        if (employees.length === 0) {

            let query = {
                'status.is_activated': EMPLOYEE_STATUS[1],
                'employment_details.employee_number': { $nin: SYSTEM_EMPLOYEES }
            };

            let allEmployees = await Employee.getSpecificEmployeeV2(query, 'basic_details employment_details benefits_details');

            employees = _.map(allEmployees, (e) => {

                return e['_id'];

            });

        }


        /*  console.log('E list', employees); */


        let query = {
            $and: [
                {
                    'payroll': { $in: payroll_ids }
                },
                {
                    'employee': { $in: employees }
                }
            ]
        }


        let employeesPayrolls = await EmployeePayment.getSpecificEmployeePayment(query, '');


        /* console.log(employeesPayrolls[0]['employee']['employment_details']); */


        if (employeesPayrolls.length > 0) {


            let emps = _.map(employeesPayrolls, (e) => {

                /* console.log(e); */

                return e['employee']['employment_details']['employee_number']


            })

            userPayrollResult = {

                is_found: true,
                employees: emps

            };

            return userPayrollResult;

        }
        else {

            userPayrollResult = {

                is_found: false,
                employees: []

            };

            return userPayrollResult;


        }


    }

}


async function getAttendanceTypes(employees, dates) {


    let employee_numbers = [];

    if (employees.length > 0) {


        let queryParams = {
            _id: {
                $in: employees
            }
        };

        let employee_documents = await Employee.getSpecificEmployeeV2(queryParams, 'basic_details employment_details');
        employee_numbers = _.map(employee_documents, obj => obj['employment_details']['employee_number']);

    }
    else {


        let employee_documents = await Employee.getSpecificEmployeeV2({}, 'basic_details employment_details');
        employee_numbers = _.map(employee_documents, obj => obj['employment_details']['employee_number'])

    }

    const attendanceTypeCountPipeline = [

        { $unwind: "$attendance_details" },
        { $unwind: "$attendance_details.attendances" },
        {
            $match: {
                'employee_number': { $in: employee_numbers },
                'attendance_details.attendances.attendance_date': { $in: dates },
            }
        },
        {
            $group: { _id: { attendance_type: "$attendance_details.attendances.attendance_type", employee_number: "$employee_number" }, count: { $sum: 1 } }
        },
        {
            $project: { _id: 0, attendance_type: "$_id.attendance_type", employee_number: "$_id.employee_number", count: 1 }
        },
        {
            $group: { _id: "$employee_number", "attendance_types": { $push: { attendance_type: "$attendance_type", attendance_count: "$count" } }, "total_days": { "$sum": "$count" } }
        },
        {
            $project: { _id: 0, employee_number: "$_id", attendance_types: 1, total_days: 1 }
        }
    ];

    let attendanceTypesDocs = await EmployeeAttendance.aggregate(attendanceTypeCountPipeline);


    for (let i = 0; i < attendanceTypesDocs.length; i++) {
        const element = attendanceTypesDocs[i];

        element['attendance_types'] = element['attendance_types'].map(ele => {

            if (ele['attendance_type'] === '') {

                ele['attendance_type'] = "NA"
                return ele;
            }
            else {

                return ele;
            }

        });

    }


    return attendanceTypesDocs;
}


async function calculateLoans(employee_id, payrollmonth, payrollyear) {

    /* payrollmonth = parseInt(payrollmonth); */

    let searchParam = {

        "employee": employee_id,
        "loan_status": LOAN_STATUS['active'],
    };

    let loanDocuments = await EmployeeLoan.getSpecificEmployeeLoan(searchParam, '');

    let loanData = loanDocuments.map(loanObj => {
        let tempLoanObj = {};
        let loanAmount = 0;

        let installments = loanObj['installments'];
        let currentInstallment = installments.filter(ele => {

            return ele['month'] == payrollmonth && ele['year'] == payrollyear

        });

        if (currentInstallment.length === 0) {

            let lastInstallment = installments.length - 1
            let lastInstallmentDate = new Date(installments[lastInstallment]['year'], installments[lastInstallment]['month']);
            let currentDate = new Date(payrollyear, payrollmonth)

            /* When Installment time has been finished and amount remaining, calculate total amount remaining */

            if (currentDate > lastInstallmentDate) {
                loanAmount = loanObj['loan_amount']['total'] - loanObj['loan_amount']['paid']
                /* console.log(loanAmount); */
                tempLoanObj = {
                    loan_id: loanObj['_id'],
                    amount: loanAmount,
                    month: payrollmonth,
                    year: payrollyear

                };

                return tempLoanObj;
            }
        }

        else {

            loanAmount = currentInstallment[0]['amount'];

            tempLoanObj = {
                loan_id: loanObj['_id'],
                amount: loanAmount,
                month: payrollmonth,
                year: payrollyear

            }

            return tempLoanObj;


        }

    }).filter((ele) => {

        return typeof ele !== 'undefined';

    });

    let loanTotalAmount = loanData.reduce((acc, ele) => {

        return ele['amount'] + acc
    }, 0)

    let loanDetails = {
        loanTotal: loanTotalAmount,
        loans: loanData

    };

    return loanDetails;

}

async function calculateFines(employee_id) {

    /* console.log(employee_id); */


    let finesDocuments = await EmployeeFine.getSpecificEmployeeFine({ employee: employee_id, fine_status: FINE_STATUS['pending'] });

    /* console.log(finesDocuments); */

    let fines = _.map(finesDocuments, (obj) => {


        const tempObj = {
            fine_id: obj['_id'],
            type: obj['type'],
            amount: parseInt(obj['amount']),
            is_included: true,

        };

        return tempObj;

    });


    let total_fine_amount = _.reduce(fines, (acc, obj) => {

        return acc + obj['amount'];


    }, 0);


    let fineObj = {

        total_fine: total_fine_amount,
        fines

    }



    return fineObj;



}

function calculateAbsentOrUndefineAmounts(employee_attendance, salary, no_of_days_month) {

    let month_days = no_of_days_month;
    /* console.log(no_of_days_month); */
    let absent = 'Absent';
    let na = 'NA';

    /* console.log('Here',employee_attendance); */

    if (typeof employee_attendance !== 'undefined') {

        let absentOrUndefinedDays = employee_attendance['attendance_types'].filter((obj) => {


            return obj['attendance_type'] === na || obj['attendance_type'] === absent


        }).reduce((acc, ele) => {

            return parseInt(ele['attendance_count']) + acc;

        }, 0);




        let salaryPerDay = salary / month_days;



        let calculatedAmountAfterDeductionOfDays = salaryPerDay * absentOrUndefinedDays;

        return parseInt(calculatedAmountAfterDeductionOfDays.toFixed());

    }

    else {

        let calculateNoAmount = salary;
        return calculateNoAmount;

    }



}

/* Benefits => Allowances */

function calculateAllowances(employeeBenefits) {


    /* console.log(employeeBenefits); */

    let allowances = employeeBenefits.map(obj => {

        const tempObj = {

            type: obj['benefit_type'],
            amount: parseInt(obj['benefit_value']),
            is_included: true

        };

        return tempObj;


    });

    let total_allowance_amount = allowances.reduce((acc, obj) => {

        return parseInt(obj['amount']) + acc;

    }, 0);



    let allowance = {

        allowances,
        total_allowance_amount

    }

    return allowance;




}

async function calculateAdvance(employee_id) {

    let advanceDocuments = await EmployeeAdvance.getSpecificEmployeeAdv({ employee: employee_id, advance_status: ADVANCE_STATUS['open'] });

    let advances = _.map(advanceDocuments, obj => {

        const tempObj = {
            advance_id: obj['_id'],
            advance_for: obj['advance_for'],
            amount: parseInt(obj['advance_amount']),
            is_included: true,
        }

        return tempObj;

    });


    let advance_amount = _.reduce(advances, (acc, ele) => {

        return acc + ele['amount'];

    }, 0);


    return {
        advance_amount,
        advances
    };



}

function calculateGratuityAmount(employee_salary, joining_date, start_date) {

    let duration = calculateDurationBetweenDates(joining_date, start_date);
    let gratuity = 0;
    let include_gratuity = false;

    /*  console.log(duration) */

    if (duration.includes('Y')) {

        let years = duration.charAt(0);
        years = parseInt(years);


        gratuity = years * employee_salary;

        return {
            gratuity,
            include_gratuity

        }
    }
    else {


        return {
            gratuity,
            include_gratuity

        }


    }


}

function calculateNetAmount(deductions, additions, gross_salary) {


    /*  let net_amount = gross_salary; */


    let deductionsArray = _.map(deductions, (value, key) => {
        return value;
    });

    /* console.log(deductionsArray); */
    let deductAmount = _.reduce(deductionsArray, (acc, value) => {

        return acc + parseInt(value);

    }, 0);


    /* console.log('Minus', deductAmount); */


    let additionsArray = _.filter(additions, (value, key) => {
        return key !== 'gratuity';
    });


    let addAmount = _.reduce(additionsArray, (acc, value) => {

        return acc + parseInt(value);

    }, 0);

    /* console.log("Add", addAmount); */

    let net_amount = gross_salary + addAmount;
    net_amount = net_amount - deductAmount;

    return net_amount;

}


async function deductAdvance(advances, end_date) {

    /* console.log(advances); */

    if (advances.length > 0) {

        return Promise.all(_.map(advances, async (adv) => {

            /* console.log(adv); */

            if (adv['is_included']) {

                let updateObj = {

                    $set: {
                        returned_on: {
                            month: end_date.getMonth(),
                            year: end_date.getFullYear()
                        },
                        advance_status: ADVANCE_STATUS['closed']
                    }
                };

                /* return adv['advance_id'] */
                /* Comment For Temp */
                let updation = await EmployeeAdvance.updateEmployeeAdv({ _id: adv['advance_id'] }, updateObj);

                if (updation['nModified'] == 1) {

                    return adv['advance_id']
                }
            }
        })
        ).then((advanceResults) => {

            advanceResults = _.filter(advanceResults, (ele) => {

                return typeof ele !== 'undefined';

            });

            /* console.log(advanceResults); */

            return advanceResults;
        });

    }
    else {
        return [];

    }

}

async function deductFine(fines, end_date) {

    if (fines.length > 0) {

        return Promise.all(_.map(fines, async (fine) => {

            if (fine['is_included']) {

                let updateObj = {

                    $set: {
                        paid: {
                            month: end_date.getMonth(),
                            year: end_date.getFullYear()
                        },
                        advance_status: FINE_STATUS['paid']
                    }
                };


                /*  return fine['fine_id'] */

                let updation = await EmployeeFine.updateEmployeeFine({ _id: fine['fine_id'] }, updateObj);

                if (updation['nModified'] == 1) {

                    return fine['fine_id']
                }

            }

        })

        ).then((fineResults) => {

            fineResults = _.filter(fineResults, (ele) => {

                return typeof ele !== 'undefined';

            });

            /* console.log(advanceResults); */

            return fineResults;
        })


    }
    else {
        return [];

    }


}

async function deductLoan(loans, end_date) {


    if (loans.length > 0) {

        return Promise.all(_.map(loans, async (loan) => {


            let loanDetails = await EmployeeLoan.getSpecificEmployeeLoan({ _id: loan['loan_id'] });
            loanDetails = loanDetails[0];



            let loanAmountCurrent = loan['amount'];
            let paidAmountPrevious = loanDetails['loan_amount']['paid'];
            let totalPaidAmount = loanAmountCurrent + paidAmountPrevious;

            /* console.log('Loan Amounts', totalPaidAmount, loanDetails['loan_amount']['total']); */
            let loan_status = LOAN_STATUS['active'];

            if (totalPaidAmount === loanDetails['loan_amount']['total']) {

                loan_status = LOAN_STATUS['cleared']
            }

            /* console.log(loan_status); */

            let amount_log = {

                amount: loanAmountCurrent,
                month: end_date.getMonth(),
                year: end_date.getFullYear()

            }


            let loanUpdateObj = {

                $set: {

                    'loan_amount.paid': totalPaidAmount,
                    'loan_status': loan_status

                },
                $push: {
                    'return_amount_logs': amount_log
                }

            };


            /* console.log(loanUpdateObj); */

            let updation = await EmployeeLoan.updateEmployeeLoan({ _id: loan['loan_id'] }, loanUpdateObj);

            if (updation['nModified'] == 1) {

                return loan['loan_id'];
            }

            /*  return loan['loan_id']; */

        })

        ).then((loanResults) => {


            /* return loanResults; */

            loanResults = _.filter(loanResults, (ele) => {

                return typeof ele !== 'undefined';

            });

            return loanResults;


        })


    }
    else {
        return [];

    }


    /* return loans; */


}

/* Fetch Queries */


/* export async function getEmployeePayrolls(req, res) {


    let queryParams = {
        employee: req.query.employee
    };


    let payrolls = await EmployeePayment.getEmployeePayments(queryParams, 'employee.basic_details');
    generateResponse(true, "employee payrolls fetched successfully", payrolls, res);


} */