/**
 * Created by Mubeen on 12/7/16.
 */
'use strict';
import {parseBody, generateResponse} from '../utilites';
import {SYSTEM_EMPLOYEES} from '../utilites/constants';
import {compare, genSalt, hash} from "bcrypt";
/* import {UserModel, UserRoleModel, CityModel, CountryModel} from '..//models'; */
import Employee from '../models/employee';
import {sign, verify} from "jsonwebtoken";
import config from "../conf";

export function login(req, res) {
    let body = parseBody(req);
    
    Employee.getSpecificEmployee({'employment_details.employee_number': body.employee_number}, (err, employee) => {
        if (employee.length > 0) {
            let user = employee[0];

            if(user.basic_details.role){

                compare(body.password, user.employment_details.password).then(valid => {
                    if(valid){
                        let payload = {};
                        if(SYSTEM_EMPLOYEES.includes( body.employee_number)){

                            payload = {
                                _id : user._id,
                                firstname : user.basic_details.firstname,
                                lastname : user.basic_details.lastname,
                                employee_number : user.employment_details.employee_number,
                                role : user.basic_details.role,
                                /* unit : user.employment_details.unit._id,
                                department : user.employment_details.department._id */
                            };

                        }
                        else{

                            payload = {
                                _id : user._id,
                                firstname : user.basic_details.firstname,
                                lastname : user.basic_details.lastname,
                                employee_number : user.employment_details.employee_number,
                                role : user.basic_details.role,
                                unit : user.employment_details.unit._id,
                                department : user.employment_details.department._id
                            };

                        }

                        

                        console.log(payload);
                        let token = sign({payload}, `${config.app['jwtsecret']}`, {expiresIn: '8h'});
                        let userData = {
                            user : user,
                            token : token
                        };
                        generateResponse(true, 'Successfully Loggedin', userData, res);
                    }
                    else{
                        generateResponse(false, "Passwords not match", null, res);
                    }
                });
            }
            else{
                generateResponse(false, "No user Role Defined", null, res);
            }
  
        }
        else{
            generateResponse(false, "Employee Number Not found", null, res);
        }
    });
}

export function changePassword(req, res) {

    let body = parseBody(req);
    /*  generateResponse(false, "Test", body, res); */
    Employee.getSpecificEmployee({'employment_details.employee_number': body.employee_number }, (err, employee) => {

        let user = employee[0];
        /* console.log(user); */
       /*  compare(body.oldpassword, user.employment_details.password).then(valid => {
            if (valid) {
              
                genSalt(parseInt(config.app['password_saltRounds'], 10)).then(salt => {

                    hash(body.newpassword, salt).then((hash) => {
    
                        let updateObj = {};
                        updateObj['employment_details.password'] = hash;
                        Employee.updateEmployee({ 'employment_details.employee_number': body.employee_number }, updateObj, (err, update) => {
                            console.log(update);
                            if (err) {
                                generateResponse(false, 'Unable to update Password', null, res);
                            }
                            generateResponse(true, 'New Password Updated', null, res);
                        });

                    });
                });
            }
            else {
                generateResponse(false, "Passwords not match", null, res);
            }
        }); */


        genSalt(parseInt(config.app['password_saltRounds'], 10)).then(salt => {

            hash(body.newpassword, salt).then((hash) => {

                let updateObj = {};
                updateObj['employment_details.password'] = hash;
                Employee.updateEmployee({ 'employment_details.employee_number': body.employee_number }, updateObj, (err, update) => {
                    console.log(update);
                    if (err) {
                        generateResponse(false, 'Unable to update Password', null, res);
                    }
                    generateResponse(true, 'New Password Updated', null, res);
                });

            });
        });
    });
}