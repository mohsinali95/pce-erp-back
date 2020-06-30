'use strict';
import { Router } from "express";
import { log, loggedIn, multerMiddlewareGuarantorCnic } from "../middlewares";
import { createTaxSlab, getSpecificTaxSlab, getTaxSlab, deleteTaxSlab, updateTaxSlab } from "../controllers/incometaxslabcontroller";
import { createNewLoanRequest, countLoanRequests, getLoanRequests, getSpecificLoanRequest, deleteLoanRequest, updateStatusLoanRequest } from "../controllers/loanrequestcontroller";
import { countAdvRequests, createNewAdvRequest, getAdvRequests, getSpecificAdvRequest, deleteAdvRequest, updateStatusAdvRequest } from "../controllers/advancerequestcontroller";
import { createNewPayroll, processPayroll, getPayrolls } from "../controllers/payrollcontroller";
import { createNewFineRequest, countFineRequests, getFineRequests, getSpecificFineRequest, deleteFineRequest, updateStatusFineRequest } from "../controllers/finerequestcontroller";


export default class ACCOUNTAPI {
    constructor() {
        this.router = Router();
        this.registerRoutes();
    }

    registerRoutes() {
        let router = this.router;

        /* IncomeTax Slabs */
        router.post('/taxslab', log, loggedIn, createTaxSlab);
        router.get('/taxslab', log, loggedIn, getTaxSlab);
        router.get('/taxslab/:slabid', log, loggedIn, getSpecificTaxSlab);
        router.delete('/taxslab', log, loggedIn, deleteTaxSlab);
        router.put('/taxslab/:slabid', log, loggedIn, updateTaxSlab);

        /* Loan Requests */
        router.post('/loan/request', log, loggedIn, multerMiddlewareGuarantorCnic, createNewLoanRequest);
        router.post('/loan/request/count', log, loggedIn, countLoanRequests);
        router.get('/loan/request', log, loggedIn, getLoanRequests);
        router.get('/loan/request/:loanrequestid', log, loggedIn, getSpecificLoanRequest);
        router.delete('/loan/request/:loanrequestid', log, loggedIn, deleteLoanRequest);
        router.put('/loan/request/status/update', log, loggedIn, updateStatusLoanRequest);

        /* Advance Requests */
        router.post('/advance/request', log, loggedIn, createNewAdvRequest);
        router.post('/advance/request/count', log, loggedIn, countAdvRequests);
        router.get('/advance/request', log, loggedIn, getAdvRequests);
        router.get('/advance/request/:advrequestid', log, loggedIn, getSpecificAdvRequest);
        router.delete('/advance/request/:advrequestid', log, loggedIn, deleteAdvRequest);
        router.put('/advance/request/status/update', log, loggedIn, updateStatusAdvRequest);

        /* Fine Requests */

        router.post('/fine/request', log, loggedIn, createNewFineRequest);
        router.post('/fine/request/count', log, loggedIn, countFineRequests);
        router.get('/fine/request', log, loggedIn, getFineRequests);
        router.get('/fine/request/:finerequestid', log, loggedIn, getSpecificFineRequest);
        router.delete('/fine/request/:finerequestid', log, loggedIn, deleteFineRequest);
        router.put('/fine/request/status/update', log, loggedIn, updateStatusFineRequest);


        /* Payrolls */
        router.post('/payroll/create', log, loggedIn, createNewPayroll);
        router.post('/payroll/process', log, loggedIn, processPayroll);
        router.get('/payroll', log, loggedIn, getPayrolls);


        
    }

    getRouter() {
        return this.router;
    }

    getRouteGroup() {
        return '/accounts';
    }
}