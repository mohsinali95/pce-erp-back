'use strict';
import mkdirp from 'mkdirp';
import { verify } from "jsonwebtoken";
import config from "../conf";
import multer from 'multer';
import Log from '../models/log';
import Role from '../models/role';

export function log(req, res, next) {

    console.log('End Point', req.originalUrl);

    /* console.log(req.body); */
    /*  console.log(res); */
    /* let logObj = {

        url : req['headers'].origin+req.originalUrl,
        method : req['method'],
        request_body : req['body'],
        request_query : req['query']
    }
    console.log(logObj);

    Log.addsystemLog(logObj, (res) => {

        console.log(res);

    }); */
    // let whitelist = Object.keys(config.whitelist).map(k => config.whitelist[k]);
    // let origin = req.ip;
    // console.log(origin);
    // let originIsWhitelisted = whitelist.indexOf(origin) !== -1 || typeof origin === "undefined";
    // if(originIsWhitelisted){
    next();
    // } else {
    //     res.status(400).json({message: 'Unauthorized Access'});
    // }
}
export function multerMiddleware(req, res, next) {
    const file_path = config.app['file_path'];
    let storage = multer.diskStorage({
        destination: (request, file, cb) => {
            let emp_number = request.body['employee_number'];
            mkdirp(file_path + 'users/' + emp_number, function (err) {
                cb(null, file_path + 'users/' + emp_number);
            });
        },
        filename: (request, file, cb) => {
            let file_extension = file.originalname.split('.')[file.originalname.split('.').length - 1];
            let file_name = `${request.body['employee_number']}${Date.now()}.${file_extension}`;
            cb(null, file_name);
        }
    });
    let upload = multer({ storage: storage }).single('file_attachment');
    upload(req, res, (err) => {
        if (err) {
            console.log(err);
            res.status(400).json({ success: false, error: ["File Cannot be Uploaded"] });
        }
        next();
    });
}

export function multerMiddlewareGuarantorCnic(req, res, next){
    const file_path = config.app['file_path'];
    let storage = multer.diskStorage({
        destination: (request, file, cb) => {
            let emp_number = request.body['employee_number'];
            mkdirp(`${file_path}users/${emp_number}/guarantor`, function (err) {
                cb(null, `${file_path}users/${emp_number}/guarantor`);
            });
        },
        filename: (request, file, cb) => {

            console.log(file)
            let file_extension = file.originalname.split('.')[file.originalname.split('.').length - 1];
            let file_name = `${request.body['employee_number']}${file.fieldname}${Date.now()}.${file_extension}`;
            cb(null, file_name);
        }

    });

    let upload = multer({ storage: storage }).fields([{
         name : "front_cnic",
         maxCount : 1 
    },
    {
        name : "back_cnic",
        maxCount : 1 
   }]);
    upload(req, res, (err) => {
        if (err) {
            console.log(err);
            res.status(400).json({ success: false, error: ["File Cannot be Uploaded"] });
        }
        next();
    });



}

export function loggedIn(req, res, next) {

    decodeToken(req).then(data => {
        req.payload = data.payload;
        next();
    }).catch(ex => {
        res.status(400).json({ success: false, error: ["Unauthenticated request"] });
        
    });
}
export function decodeToken(req) {
    return new Promise((resolve, reject) => {
        let { token } = req.headers;
        verify(token, `${config.app['jwtsecret']}`, (err, decoded) => {
            if (err === null) {
                resolve(decoded);
            } else {
                reject(err);
            }
        });
    });
}

export function accessControl(req, res, next) {

    decodeToken(req).then(data => {
        console.log('Access Control');
        req.payload = data.payload;

        let path = req.route.path.substring(1);
        let method = req.method;

        Role.getSpecificRole({ '_id': req.payload.role }, (err, role) => {
            
            
            let accessGranted = role[0].permissions[path];
            
            if (method === 'GET') {

                if (accessGranted['r']) {
                    next();
                }
                else {
                    res.status(400).json({ success: false, error: ["Read Access Undefined"] });
                }

            }
            else if (method === 'POST') {
                if (accessGranted['c']) {
                    next();
                }
                else {
                    res.status(400).json({ success: false, error: ["Create Access Undefined"] });
                }
            }
            else if (method === 'PUT') {
                if (accessGranted['u']) {
                    next();
                }
                else {
                    res.status(400).json({ success: false, error: ["Update Access Undefined"] });
                }
            }
            else if (method === 'DELETE') {
                if (accessGranted['d']) {
                    next();
                }
                else {
                    res.status(400).json({ success: false, error: ["Delete Access Undefined"] });
                }
            }


        });
    }).catch(ex => {
        res.status(400).json({ success: false, error: ["Access Undefined"] });
    });

}