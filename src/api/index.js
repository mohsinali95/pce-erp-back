'use strict';
import {Router, NextFunction, Request, Response} from "express";
import AuthAPI from "./auth";
import HRAPI from "./hr";
import DEVAPI from "./dev";
import RPACAPI from './role';
import ACCOUNTAPI from "./accounts";
import REPORTAPI from "./reports";

export default class Api {
    constructor(app) {
        this.app = app;
        this.router = Router();
        this.routeGroups = [];
    }

    loadRouteGroups() {
        this.routeGroups.push(new AuthAPI());
        this.routeGroups.push(new HRAPI());
        this.routeGroups.push(new DEVAPI());
        this.routeGroups.push(new ACCOUNTAPI());
        this.routeGroups.push(new RPACAPI());
        this.routeGroups.push(new REPORTAPI());

    }

    setContentType(req, resp, next) {
        resp.set('Content-Type', 'text/json');
        next();
    }

    registerGroup() {
        this.loadRouteGroups();
        this.routeGroups.forEach(rg => {
            let setContentType = rg.setContentType ? rg.setContentType : this.setContentType;
            this.app.use('/api' + rg.getRouteGroup(), setContentType, rg.getRouter())
        });
    }
}
