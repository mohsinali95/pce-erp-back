'use strict';
import { Router } from "express";
import { log, loggedIn } from "../middlewares";
import { addDocument, generateEmployeeRandomData, generateUnitRandomData, tempTransfer, updateUserRoles, updateEmployeesData, addReportinglineInDept, updateUnitTime, updateAttendanceDetails, updateEmployeeSalaryDetails, tempSetLeaveDays } from '../controllers/devcontroller';


export default class DEVAPI {
    constructor() {
        this.router = Router();
        this.registerRoutes();
    }

    registerRoutes() {
        let router = this.router;
        
        router.post('/document/add', log, addDocument);
        router.get('/generate/employees', log, generateEmployeeRandomData);
        router.get('/generate/units', log, generateUnitRandomData);
        /* Temp APIs for Test */
        router.post('/temp/transfer', log, tempTransfer);
        router.post('/temp/leave', log, tempSetLeaveDays);
        


        router.get('/update/employee/roles', log, updateUserRoles);
        router.get('/update/employees', log, updateEmployeesData);
        /* Create Reportline */
        router.post('/reportingline/create', log, addReportinglineInDept);
        router.put('/update/unit', log, updateUnitTime);
        router.put('/update/attendancedetails', log, updateAttendanceDetails);
        router.put('/update/employee/salary', log, updateEmployeeSalaryDetails);
 


        
    }

    getRouter() {
        return this.router;
    }

    getRouteGroup() {
        return '/dev';
    }
}