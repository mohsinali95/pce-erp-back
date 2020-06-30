'use strict';
import { parseBody, generateResponse } from '../utilites';
import { decryptValue } from '../utilites/encryption-module';
import Department from '../models/department';
import Employee from '../models/employee';
import HireRequest from '../models/hirerequests';
import LeaveRequest from '../models/leaverequest';
import TransferRequest from '../models/transferrequest';
import LoanRequest from '../models/loanrequest';
import AdvanceRequest from '../models/advancerequest';
import FineRequest from '../models/finerequest';

import { REQUEST_TYPE, REQUEST_STATUS, LEAVE_REQUEST_STATUS, TRANSFER_REQUEST_STATUS, LOAN_REQUEST_STATUS, ADV_REQUEST_STATUS, FINE_REQUEST_STATUS } from '../utilites/constants';
import _ from 'lodash';

export function addDepartment(req, res) {

    let department = parseBody(req);
    department['manager'] = null;
    department['requestline'] = [];


    for (let i = 0; i < REQUEST_TYPE.length; i++) {

        department['requestline'].push({
            'request_type': REQUEST_TYPE[i]

        });

    }

    console.log(department);

    Department.getSpecificDepartment({ code: department.code }, (err, data) => {

        if (data.length == 0) {
            if (department.is_parent == true) {
                Department.getSpecificDepartment({ is_parent: department['is_parent'], unit_id: department['unit_id'] }, (err, data) => {

                    if (data.length == 0) {

                        Department.addDepartment(department, function (err, department) {
                            if (err) {
                                console.log(err);
                                generateResponse(false, "Unable to Create Department", null, res);
                            }
                            generateResponse(true, "Successfully Created Department", department, res);
                        });

                    }
                    else {
                        generateResponse(false, "parent already exist", data.length, res);
                    }

                });


            }
            else {

                Department.addDepartment(department, function (err, department) {
                    if (err) {
                        console.log(err);
                        generateResponse(false, "Unable to Create Department", null, res);
                    }
                    generateResponse(true, "Successfully Created Department", department, res);
                });

            }
        }
        else {

            generateResponse(false, "Department Code Already Exist", data.length, res);

        }
    });


}
export function getDepartment(req, res) {

    /*  let queryParams = {
         unit_id : req.query.unit_id || '',
         search: req.query.search || '',
         status: req.query.status || '',
         page: req.query.page || 1,
         limit: req.query.limit || 10,
         sort: req.query.sort,
         sortby: req.query.sortby,
         startdate: req.query.startdate,
         enddate: req.query.enddate
 
     }; */

    let queryParams = {
        unit_id: decryptValue(req.query.unit_id),
        search: decryptValue(req.query.search) || '',
        status: decryptValue(req.query.status) || '',
        page: decryptValue(req.query.page) || 1,
        limit: decryptValue(req.query.limit) || 100,
        sort: decryptValue(req.query.sort),
        sortby: decryptValue(req.query.sortby),
        startdate: decryptValue(req.query.startdate),
        enddate: decryptValue(req.query.enddate)
    };

    console.log(queryParams);
    let date = new Date();

    queryParams.unit_id = queryParams.unit_id.split(',');
    console.log(queryParams.unit_id)

    queryParams.startdate = queryParams.startdate || '2018-1-01';
    queryParams.enddate = queryParams.enddate || date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate();

    Department.getDepartment(queryParams, (err, departments) => {

        if (err) {
            console.log(err);
            generateResponse(false, "Unable to Fetch Departments", null, res);
        }

        Department.countDepartment(queryParams, function (err, count) {

            if (count != 0) {
                let data = {
                    data: departments,
                    current: queryParams.page,
                    pages: Math.ceil(count / queryParams.limit),
                    totalrecords: count
                }
                generateResponse(true, "Fetch Departments", data, res);
            }
            else {

                let data = {
                    data: departments,
                    current: queryParams.page,
                    pages: queryParams.page,
                    totalrecords: count
                }
                generateResponse(true, "Fetch Departments", data, res);
            }
        });
    });
}
export function updateDepartment(req, res) {

    let body = parseBody(req);
    let deptId = decryptValue(body['_id']);
    let updateObj = {};


    updateObj['name'] = body['name'];
    updateObj['prefix'] = body['prefix'];
    updateObj['status.is_activated'] = body['status']['is_activated'];

    Department.updateDepartment({ '_id': deptId }, updateObj, (err, update) => {
        console.log(update);

        if (err) {
            generateResponse(false, 'Unable to update Department', null, res);
        }
        generateResponse(true, 'Department Updated', null, res);
    });
}


export async function updateParentDeptFlag(req, res) {


    let body = parseBody(req);
    /* let deptId = decryptValue(body['_id']); */
    let deptId = body['_id'];


    Department.getSpecificDepartment({ _id: deptId }, async (err, data) => {


        if (err) {
            console.log(err);
            generateResponse(false, 'Error', err, res);
        }

        let department = data[0];
        let unit_id = department['unit_id']['_id'];


        let employeesCount = await Employee.countEmployee({ unit: [unit_id], status: 'Activated' });

        if (employeesCount > 0) {

            generateResponse(false, 'Parent Cannot be changed', null, res);
        }
        else {

            if (department['is_parent']) {
                generateResponse(false, 'Department is Already Parent', null, res);
            }
            else {
                let updateObjOne = {};
                let updateObjTwo = {};



                updateObjOne['is_parent'] = false;
                updateObjTwo['is_parent'] = true;

                Department.updateDepartment({ is_parent: true, unit_id: unit_id }, updateObjOne, (err, update) => {
                    console.log(update);

                    if (err) {
                        generateResponse(false, 'Unable to update Department', null, res);
                    }


                    Department.updateDepartment({ _id: deptId }, updateObjTwo, (err, update) => {
                        console.log(update);

                        if (err) {
                            generateResponse(false, 'Unable to update Department', null, res);
                        }
                        generateResponse(true, 'Department Parent Updated', null, res);
                    });
                });
            }
        }


    });



}

export function deleteDepartment(req, res) {

    let departmentid = decryptValue(req.query.id);
    /* let departmentid = req.query.id;  */

    Employee.getSpecificEmployee({ 'employment_details.department': departmentid }, (err, employees) => {
        _.map(employees, (emp) => {

            let eid = emp._id;
            console.log(emp);
            Employee.deleteEmployee(eid, (err, update) => {
                if (err) {
                    generateResponse(false, 'Unable to delete Employee with Department', null, res);
                }
                console.log(update);
            });
        });
        Department.deleteDepartment(departmentid, (err, update) => {

            if (err) {
                generateResponse(false, 'Unable to delete Department', null, res);
            }
            generateResponse(true, 'Department Deleted with All Employees', null, res);
        });

    });
}
export function getSpecificDepartment(req, res) {

    let id = decryptValue(req.params.id);
    /*  let id = req.params.id; */
    Department.getSpecificDepartment({ _id: id }, (err, department) => {

        if (err) {
            generateResponse(false, 'Unable to Fetched Speicific Department', null, res);
        }
        generateResponse(true, 'Fetched Speicific Department', department, res);
    });
}
export function updateDepartmentManager(req, res) {

    let body = parseBody(req);
    let deptId = decryptValue(body['_id']);
    /* let deptId = body['_id']; */
    let updateObj = {};
    updateObj['manager'] = body['manager'];


    Department.updateDepartment({ '_id': deptId }, updateObj, (err, update) => {
        console.log(update);

        if (err) {
            generateResponse(false, 'Unable to update Department', null, res);
        }
        generateResponse(true, 'Department Manager Updated', null, res);
    });



}
export async function updateReportingLine(req, res) {

    let body = parseBody(req);
    let userPayload = req.payload;
    /* let requestlineId = decryptValue(body['_id']); */
    let deptId = body['_id'];
    let requestlineId = body['requestline._id']
    let updateObj = {
        'requestline.$.priority_order': body['priority_order']
    };

    let updateParams = {};
    let updateData = {};

    /* Hiring */
    if (body['requestline.request_type'] == REQUEST_TYPE[0]) {

        updateParams = {
            'department': body['_id'],
            'request_status': REQUEST_STATUS['pending']
        }


        updateData = {
            'request_status': REQUEST_STATUS['rejected'],
            'closing_reason': "Request was closed due to change in reportline",
            $push: {
                'status_log': {
                    'status': REQUEST_STATUS['rejected'],
                    'action_by': userPayload['_id'],
                    'updated_at': new Date
                }
            }
        };

        HireRequest.updateHiringRequests(updateParams, updateData, (err, update) => {

            if (err) {
                generateResponse(false, 'Unable to Update Hiring Requests', null, res);
            }
            Department.updateDepartment({ '_id': deptId, 'requestline._id': requestlineId }, updateObj, (err, update) => {
                if (err) {
                    console.log(err.message);
                    generateResponse(false, 'Unable to update Department', null, res);
                }
                generateResponse(true, 'Department Reportline Updated', null, res);
            });


        });
    }


    /* Leave */
    else if (body['requestline.request_type'] == REQUEST_TYPE[1]) {


        updateParams = {

            'department': body['_id'],
            'request_status': LEAVE_REQUEST_STATUS['pending']
        }

        updateData = {
            'request_status': LEAVE_REQUEST_STATUS['rejected'],
            'closing_reason': "Request was closed due to change in reportline",
            $push: {
                'status_log': {
                    'status': LEAVE_REQUEST_STATUS['rejected'],
                    'action_by': userPayload['_id'],
                    'updated_at': new Date
                }
            }
        };


        LeaveRequest.updateManyLeaveRequests(updateParams, updateData, (err, update) => {
            if (err) {
                generateResponse(false, 'Unable to Update Leave Reporting line', null, res);
            }

            Department.updateDepartment({ '_id': deptId, 'requestline._id': requestlineId }, updateObj, (err, update) => {
                if (err) {
                    console.log(err.message);
                    generateResponse(false, 'Unable to update Department', null, res);
                }
                generateResponse(true, 'Department Reportline Updated', null, res);
            });

        });
    }

    /* Transfer */
    else if (body['requestline.request_type'] == REQUEST_TYPE[2]) {


        updateParams = {
            'department': body['_id'],
            'request_status': TRANSFER_REQUEST_STATUS['pending']
        }

        updateData = {
            'request_status': TRANSFER_REQUEST_STATUS['rejected'],
            'closing_reason': "Request was closed due to change in reportline",
            $push: {
                'status_log': {
                    'status': TRANSFER_REQUEST_STATUS['rejected'],
                    'action_by': userPayload['_id'],
                    'updated_at': new Date
                }
            }
        };


        TransferRequest.updateManyTransferRequests(updateParams, updateData, (err, update) => {
            if (err) {
                generateResponse(false, 'Unable to Update Transfer Reporting line', null, res);
            }

            Department.updateDepartment({ '_id': deptId, 'requestline._id': requestlineId }, updateObj, (err, update) => {
                if (err) {
                    console.log(err.message);
                    generateResponse(false, 'Unable to update Department', null, res);
                }
                generateResponse(true, 'Department Reportline Updated', update, res);
            });

        });
    }


    /* Loan */
    else if (body['requestline.request_type'] == REQUEST_TYPE[3]) {


        updateParams = {
            'department': body['_id'],
            'request_status': LOAN_REQUEST_STATUS['pending']
        }

        updateData = {
            'request_status': LOAN_REQUEST_STATUS['rejected'],
            'closing_reason': "Request was closed due to change in reportline",
            $push: {
                'status_log': {
                    'status': LOAN_REQUEST_STATUS['rejected'],
                    'action_by': userPayload['_id'],
                    'updated_at': new Date
                }
            }
        };
        try {
            let updation = await LoanRequest.updateManyLoanRequests(updateParams, updateData);
            console.log(updation)
            Department.updateDepartment({ '_id': deptId, 'requestline._id': requestlineId }, updateObj, (err, update) => {
                if (err) {
                    console.log(err.message);
                    generateResponse(false, 'Unable to update Department', null, res);
                }
                generateResponse(true, 'Department Reportline Updated', update, res);
            });
        } catch (error) {
            console.log(error);
            generateResponse(false, 'Unable to Update Loan Reporting line', null, res);
        }
    }

    /* Advance */
    else if (body['requestline.request_type'] == REQUEST_TYPE[4]) {


        updateParams = {
            'department': body['_id'],
            'request_status': ADV_REQUEST_STATUS['pending']
        }

        updateData = {
            'request_status': ADV_REQUEST_STATUS['rejected'],
            'closing_reason': "Request was closed due to change in reportline",
            $push: {
                'status_log': {
                    'status': ADV_REQUEST_STATUS['rejected'],
                    'action_by': userPayload['_id'],
                    'updated_at': new Date
                }
            }
        };
        try {
            let updation = await AdvanceRequest.updateManyAdvRequests(updateParams, updateData);
            console.log(updation)
            Department.updateDepartment({ '_id': deptId, 'requestline._id': requestlineId }, updateObj, (err, update) => {
                if (err) {
                    console.log(err.message);
                    generateResponse(false, 'Unable to update Department', null, res);
                }
                generateResponse(true, 'Department Reportline Updated', update, res);
            });
        } catch (error) {
            console.log(error);
            generateResponse(false, 'Unable to Update Loan Reporting line', null, res);
        }
    }

    else if (body['requestline.request_type'] == REQUEST_TYPE[5]) {


        updateParams = {
            'department': body['_id'],
            'request_status': FINE_REQUEST_STATUS['pending']
        }

        updateData = {
            'request_status': FINE_REQUEST_STATUS['rejected'],
            'closing_reason': "Request was closed due to change in reportline",
            $push: {
                'status_log': {
                    'status': FINE_REQUEST_STATUS['rejected'],
                    'action_by': userPayload['_id'],
                    'updated_at': new Date
                }
            }
        };
        try {
            let updation = await FineRequest.updateManyFineRequests(updateParams, updateData);
            console.log(updation)
            Department.updateDepartment({ '_id': deptId, 'requestline._id': requestlineId }, updateObj, (err, update) => {
                if (err) {
                    console.log(err.message);
                    generateResponse(false, 'Unable to update Department', null, res);
                }
                generateResponse(true, 'Department Reportline Updated', update, res);
            });
        } catch (error) {
            console.log(error);
            generateResponse(false, 'Unable to Update Loan Reporting line', null, res);
        }
    }
}
