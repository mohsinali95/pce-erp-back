// import "@babel/polyfill";
import "core-js/stable";
import "regenerator-runtime/runtime";
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import express from 'express';
import config from './conf';
import http from 'http';
import cors from 'cors';
import mongoose from 'mongoose';
import morgan from 'morgan';
import rfs from 'rotating-file-stream';
import path from 'path';
import Api from './api';
import { log } from './middlewares/index';
import { DefaultController } from './controllers/defaultcontroller';
import { createAttendanceMonthEmployeeCron, reverseTemporaryTransfer, leaveOnEmployeeAttendance } from './crons/index';

mongoose.connect(config.database['path'], { useNewUrlParser: true });

let port = config.app['port'];
import Employee from './models/employee';

let app = express();
/* Cron Schedules */
createAttendanceMonthEmployeeCron();
reverseTemporaryTransfer();
leaveOnEmployeeAttendance();
/* Cron End */

let whitelist = Object.keys(config.whitelist).map(k => config.whitelist[k]);

let accessLogStream = rfs('access.log', {
    interval: '1d', // rotate daily
    path: /* path.join(__dirname, 'log') */ `${config.app['file_path']}log`
});
app.set("port", port);
app.use(bodyParser.json({ limit: config.app['bodyLimit'] }));
app.use(morgan('common', { stream: accessLogStream }));
app.use(cookieParser(config.app['cookie_secret']));
app.use(cors({
    // origin: (origin, callback) => {
    //     console.log(origin);
    //     let originIsWhitelisted = whitelist.indexOf(origin) !== -1 || typeof origin === "undefined";
    //     console.log('Is IP allowed: ' + originIsWhitelisted);
    //     let failureResp = 'You are not authorized to perform this action';
    //     callback(originIsWhitelisted ? null : failureResp, originIsWhitelisted);
    // }
}));

async function DeleteData(params) {
    let regexPattern = "^[0-9]+$"
    let employees = await Employee.deleteMany({ 'employment_details.employee_number': { $regex: regexPattern, $ne: "000" } })
    console.log(employees)

}

async function replaceEmployeeCode() {

    let regexPattern = `^pf-[0-9]+$|^pf[0-9]+$|^PF[0-9]+$|^Pf[0-9]+$|^Pf-[0-9]+$|^[0-9]+$`;
    let regexPatternFine = `^PF-[0-9]+$`;

    let employees = await Employee.find({ 'employment_details.employee_number': { $regex: regexPattern, $ne: "000" } })
    let employeesAll = await Employee.find({ 'employment_details.employee_number': { $ne: "000" } })
    let employeesFine = await Employee.find({ 'employment_details.employee_number': { $regex: regexPatternFine, $ne: "000" } })
    let allEmpNum = employees.map(async (emp) => {
        let empNum = emp["employment_details"]["employee_number"]
        empNum = empNum.split("")
        console.log(empNum)

        if (empNum.length == 1) {
            empNum.splice(0, 0, "P", "F", "-", "0", "0")

        }
        if (empNum.length == 2) {
            empNum.splice(0, 0, "P", "F", "-", "0")

        }
        if (empNum.length == 3) {
            empNum.splice(0, 0, "P", "F", "-")

        }
        if (empNum.length == 5) {
            empNum[0] = empNum[0].toUpperCase()
            empNum[1] = empNum[1].toUpperCase()
            empNum.splice(2, 0, "-")
        }
        if (empNum.length == 6) {
            empNum[0] = empNum[0].toUpperCase()
            empNum[1] = empNum[1].toUpperCase()
        }
        empNum = empNum.join("")
        console.log(empNum)

        // await Employee.updateOne({ 'employment_details.employee_number': emp["employment_details"]["employee_number"] }, {'employment_details.employee_number': empNum});
        return empNum
    })

    console.log(employees.length)
    console.log("All", employeesAll.length)
    console.log("fine", employeesFine.length)

}

async function revertCodesNumbers() {
    let employeeCodes = ["PF-004", "PF-023", "PF-106", "PF-110", "PF-112", "PF-114", "PF-118", "PF-119", "PF-120", "PF-122", "PF-177"]
    let employees = await Employee.find({ 'employment_details.employee_number': { $in: employeeCodes } })

    employees.forEach(async (val) => {
        let empNum = val["employment_details"]["employee_number"]

        empNum = empNum.split("-")

        console.log(empNum[1])

        await Employee.updateOne({ 'employment_details.employee_number': val["employment_details"]["employee_number"] }, { 'employment_details.employee_number': empNum[1] });


    })
    console.log(employees.length)
}

async function revertCodesPF() {
    let employeeCodes = ["PF-005", "PF-006", "PF-007", "PF-012", "PF-013", "PF-014",
        "PF-017", "PF-020", "PF-032", "PF-054", "PF-111", "PF-116", "PF-123", "PF-126", "PF-127", "PF-128",
        "PF-131", "PF-133", "PF-137", "PF-151"]
    let employees = await Employee.find({ 'employment_details.employee_number': { $in: employeeCodes } })

    employees.forEach(async (val) => {
        let empNum = val["employment_details"]["employee_number"]
        empNum = empNum.split("")
        empNum.splice(2, 1)

        console.log(empNum.join(""))

        await Employee.updateOne({ 'employment_details.employee_number': val["employment_details"]["employee_number"] }, {'employment_details.employee_number': empNum.join("")});


    })
    console.log(employees.length)
}

async function revertCodespfSmall() {
    let employeeCodes = ["PF-011", "PF-124", "PF-125", "PF-129"]
    let employees = await Employee.find({ 'employment_details.employee_number': { $in: employeeCodes } })

    employees.forEach(async (val) => {
        let empNum = val["employment_details"]["employee_number"]

        empNum = empNum.split("")
        empNum.splice(2,1)
        empNum[0] = empNum[0].toLowerCase()
        empNum[1] = empNum[1].toLowerCase()
        console.log(empNum.join(""))

        await Employee.updateOne({ 'employment_details.employee_number': val["employment_details"]["employee_number"] }, {'employment_details.employee_number': empNum.join("")});


    })
    console.log(employees.length)
}

// replaceEmployeeCode()
// DeleteData()
// revertCodesNumbers()
// revertCodesPF()
// revertCodespfSmall()

new Api(app).registerGroup();
app.use(express.static(config.app['file_directory']))
app.use('/', log, DefaultController);

http.createServer(app).on('error', function () {
    console.log('Can\'t connect to server.');
})
    .listen(port, () => {
        console.log(`Server Started :: ${port}`);
    });