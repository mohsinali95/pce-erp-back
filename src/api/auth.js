'use strict';

import {Router} from "express";
import {log, loggedIn} from "../middlewares/index";
import {login, changePassword} from '../controllers/authcontroller';


export default class AuthAPI {
    constructor() {
        this.router = Router();
        this.registerRoutes();
    }

    registerRoutes() {
        let router = this.router;
        router.post('/login', log, login);
        router.post('/change/password', log,loggedIn, changePassword);
    }

    getRouter() {
        return this.router;
    }

    getRouteGroup() {
        return '/auth';
    }
}