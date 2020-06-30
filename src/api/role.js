'use strict';
import { Router } from "express";
import { log, loggedIn } from "../middlewares";
import { addRole, getRole, deleteRole, updateRole, getSpecificRole } from '../controllers/rolecontroller';


export default class RPACAPI {
    constructor() {
        this.router = Router();
        this.registerRoutes();
    }

    registerRoutes() {
        let router = this.router;
        router.post('/role', log, loggedIn, addRole);
        router.get('/role', log,loggedIn, getRole);
        router.get('/role/:id', log,loggedIn, getSpecificRole);
        router.delete('/role',log,loggedIn, deleteRole);
        router.put('/role',log, loggedIn, updateRole);

    }

    getRouter() {
        return this.router;
    }

    getRouteGroup() {
        return '/rpac';
    }
}