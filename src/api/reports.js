'use strict';
import { Router } from "express";
import { log, loggedIn } from "../middlewares";
import { branchListingReport, payrollReport, branchSalaryReport, loanReport, branchAllowanceReport, employeeAllowanceReport, leftOverEmployeesReport } from "../controllers/reportscontroller";

export default class REPORTAPI {
    constructor() {
        this.router = Router();
        this.registerRoutes();
    }

    registerRoutes() {
        let router = this.router;
        
        
        router.post('/branch/listing', log, loggedIn, branchListingReport);
        router.post('/payroll', log, loggedIn, payrollReport);
        router.post('/branch/payroll', log, loggedIn, branchSalaryReport);
        router.post('/loan', log, loggedIn, loanReport);
        router.post('/allowance', log, loggedIn, employeeAllowanceReport);
        router.post('/employees/left', log, loggedIn, leftOverEmployeesReport);

        
    }

    getRouter() {
        return this.router;
    }

    getRouteGroup() {
        return '/report';
    }
}