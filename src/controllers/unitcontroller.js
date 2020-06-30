'use strict';
import { parseBody, generateResponse } from '../utilites';
import { decryptValue, decryptObject } from '../utilites/encryption-module';
import { validateEmail } from '../utilites/validators';
import Unit from '../models/unit';
import Department from '../models/department';
import Employee from '../models/employee';
import _ from 'lodash';

export async function addUnit(req, res) {

    let unit = parseBody(req);

    if (validateEmail(unit.email)) {

        const data = await Unit.getSpecificUnit({ code: unit.code });
        if (data.length == 0) {
            Unit.addUnit(unit, function (err, unit) {
                if (err) {
                    console.log(err);
                    generateResponse(false, "Unable to Create Unit", null, res);
                }
                generateResponse(true, "Successfully Created Unit", unit, res);
            });
        }
        else {
            generateResponse(false, "Code Already Exist", null, res);
        }
    }
    else {
        generateResponse(false, "Email Not Valid", null, res);
    }
}

export function getUnit(req, res) {



    let queryParams = {

        search: decryptValue(req.query.search) || '',
        status: decryptValue(req.query.status) || '',
        page: decryptValue(req.query.page) || 1,
        limit: decryptValue(req.query.limit) || 100,
        sort: decryptValue(req.query.sort),
        sortby: decryptValue(req.query.sortby),
        startdate: decryptValue(req.query.startdate),
        enddate: decryptValue(req.query.enddate),
        unit_type: decryptValue(req.query.unit_type)

    };

    if (decryptValue(req.query.parent) != '' || decryptValue(req.query.unit_type) == 0) {
        queryParams.parent_unit = decryptValue(req.query.parent) || null
    }

    console.log(queryParams);
    let date = new Date();
    // queryParams.parent_unit = queryParams.parent_unit || null;
    queryParams.startdate = queryParams.startdate || '2018-1-01';
    queryParams.enddate = queryParams.enddate || date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate();

    Unit.getUnit(queryParams, (err, units) => {

        if (err) {
            console.log(err);
            generateResponse(false, "Unable to Fetch Units", null, res);
        }

        Unit.countUnit(queryParams, function (err, count) {

            if (count != 0) {
                let data = {
                    data: units,
                    current: queryParams.page,
                    pages: Math.ceil(count / queryParams.limit),
                    totalrecords: count
                }
                generateResponse(true, "Fetch Units", data, res);
            }
            else {
                let data = {
                    data: units,
                    current: queryParams.page,
                    pages: queryParams.page,
                    totalrecords: count
                }
                generateResponse(true, "Fetch Units", data, res);
            }
        });
    });
}

export async function updateUnit(req, res) {

    let unitObject = parseBody(req);
    unitObject['_id'] = decryptValue(unitObject['_id']);
    let updateObj = {};
    updateObj['name'] = unitObject['name'];
    updateObj['phone_number'] = unitObject['phone_number'];
    updateObj['email'] = unitObject['email'];
    updateObj['address'] = unitObject['address'];
    updateObj['status.is_activated'] = unitObject['status']['is_activated'];

    let updataParam = { _id: unitObject['_id'] };
    try {
        let result = await Unit.updateUnit(updataParam, updateObj);
        generateResponse(true, 'Unit Updated', result, res);
    }
    catch (e) {
        console.log(e);
        generateResponse(false, 'Unable to update Unit', null, res);
    }
}

export async function getSpecificUnit(req, res) {

    let id = decryptValue(req.params.id);

    let find = {
        _id: id,
        'status.is_deleted': false
    }
    try {
        let unit = await Unit.getSpecificUnit(find);
        generateResponse(true, 'Fetched Speicific Unit', unit, res);

    } catch (e) {
        generateResponse(false, 'Unable to Fetched Speicific Unit', null, res);
    }
}

export async function deleteUnit(req, res) {

    let unitid = decryptValue(req.query.id);
    /* let unitid = req.query.id; */

    /* For Child Units and their Departments and their Employees */

    try {
        let units = await Unit.getSpecificUnit({ ancestors: unitid });

        console.log('Units');
        _.map(units, (u) => {
            console.log(u);
            let subunitid = u._id;
            Department.getSpecificDepartment({ unit_id: subunitid }, (err, departments) => {
                console.log(u.name + ' Departments');
                _.map(departments, (d) => {
                    let deptId = d._id;
                    /* console.log(deptId); */
                    Employee.getSpecificEmployee({ 'employment_details.department': deptId }, (err, employees) => {
                        console.log(d.name + 'Employees');
                        _.map(employees, (e) => {
                            console.log(e);
                            let eid = e._id;
                            Employee.deleteEmployee(eid, (err, update) => {
                                if (err) {
                                    generateResponse(false, 'Unable to delete Employee with Unit', null, res);
                                }
                                console.log(update);
                            });
                        });
                    });
                    Department.deleteDepartment(deptId, (err, update) => {
                        if (err) {
                            generateResponse(false, 'Unable to delete Sub Unit', null, res);
                        }
                        console.log(update);
                    });
                });

            });
            Unit.deleteUnit(subunitid, (err, update) => {
                if (err) {
                    generateResponse(false, 'Unable to delete Sub Unit', null, res);
                }
                console.log(update);
            });
        });


    }
    catch (e) {
        generateResponse(false, 'Unable to delete Department with Unit', null, res);

    }
    /* For Department of Current Unit and their Dept-Employees */
    Department.getSpecificDepartment({ unit_id: unitid }, (err, sub_departments) => {

        console.log('Main Departments');
        /* console.log(sub_departments); */
        _.map(sub_departments, (dept) => {
            console.log(dept);
            let departmentid = dept._id;
            Employee.getSpecificEmployee({ 'employment_details.department': departmentid }, (err, employees) => {
                console.log('Main Employees');
                _.map(employees, (e) => {
                    let eid = e._id;
                    console.log(e);
                    Employee.deleteEmployee(eid, (err, update) => {
                        if (err) {
                            generateResponse(false, 'Unable to delete Employee with Unit', null, res);
                        }
                        console.log(update);
                    });

                });
            });
            Department.deleteDepartment(departmentid, (err, update) => {
                if (err) {
                    generateResponse(false, 'Unable to delete Department with Unit', null, res);
                }
                console.log(update);
            });

        });

    });

    Unit.deleteUnit(unitid, (err, update) => {

        if (err) {
            generateResponse(false, 'Unable to delete Unit', null, res);
        }
        console.log('OK all');
        generateResponse(true, 'Unit Deleted with all Employees and Departments', null, res);
    });
}

export async function updateUnitConfiguration(req, res) {

    let unit = parseBody(req);
    unit['_id'] = decryptValue(unit['_id']);
    let updateObj = {};
    updateObj['configuration.week_start'] = unit['week_start'];
    updateObj['configuration.holidays'] = unit['holidays'];
    updateObj['configuration.working_hours'] = unit['working_hours'];

    console.log(updateObj);
    let updataParam = { _id: unit['_id'] };
    try {
        let result = await Unit.updateUnit(updataParam, updateObj);
        generateResponse(true, 'Unit Configuration Updated', result, res);
    }
    catch (e) {
        console.log(e);
        generateResponse(false, 'Unable to update Unit', null, res);
    }
}


export async function checkUnitExist(req, res) {

    try {

        let body = parseBody(req);
        let queryParams = {
            code: body['code']
        }

        let unit = await Unit.getSpecificUnit(queryParams);
        console.log(unit);

        if (unit.length > 0) {
            generateResponse(true, "unit check", { isUnitExist: true }, res);
        }
        else {
            generateResponse(true, "unit check", { isUnitExist: false }, res);
        }
    }
    catch (e) {
        console.log(e);
        generateResponse(false, "unable to check unit", null, res);

    }
}