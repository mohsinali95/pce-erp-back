'use strict';

import { parseBody, generateResponse } from '../utilites';
import Role from '../models/role';
import Employee from '../models/employee';
import { decryptValue } from '../utilites/encryption-module';
import _ from 'lodash';
import async from 'async';

export function addRole(req, res) {

    let body = parseBody(req);
    console.log(body);
    Role.getSpecificRole({ name: body.name, 'status.is_deleted': false }, (err, data) => {
        if (data.length == 0) {
            Role.addRole(body, function (err, result) {
                if (err) {
                    console.log(err);
                    generateResponse(false, "Unable to Create Role", null, res);
                }
                generateResponse(true, "Successfully Created Role", result, res);
            });
        }
        else {
            generateResponse(false, "Role Already Exist", null, res);
        }
    });
}

export async function getRole(req, res) {

    console.time("query_time");

    let queryParams = {
        page: req.query.page || 1,
        limit: req.query.limit || 10,
        sort: req.query.sort,
        sortby: req.query.sortby,
    };
    try {


      


        /* let employees = await Role.aggregate([
            { $match: { name:  "executive"  } },
            { $group: { _id: null, count: { $sum: 1 } } }

        ]); */

        /* let e = await Employee.aggregate([

            { $match: {  "basic_details.role" : new mongoose.Types.ObjectId('5bf7e3dceca3ae4df4159dcd') } },
            { $group: { _id: null, count: { $sum: 1 } } }

          


        ])


        generateResponse(false, "test", e, res); */

          Role.getRoles(queryParams, (err, roles) => {
  
              if (err) {
                  console.log(err);
                  generateResponse(false, "Unable to Fetch Roles", null, res);
              }
              let userCountFunctions = [];
              roles.forEach(function (item) {
                  let id = item._id;
                  userCountFunctions.push(async (callback) => {
                      let count = await Employee.countEmployee({ roleid: id })
                      callback(null, count);
  
                  });
              });
              async.parallel(userCountFunctions, (err, results) => {
                  for (let i = 0; i < results.length; i++) {
                      roles[i]['users'] = results[i];
  
                  }
                  Role.countRoles(queryParams, (err, count) => {
                     console.timeEnd("query_time");
                      if (count != 0) {
                          let data = {
                              data: roles,
                              current: queryParams.page,
                              pages: Math.ceil(count / queryParams.limit),
                              totalrecords: count
                          }
                          generateResponse(true, "Fetch Roles", data, res);
                      }
                      else {
  
                          let data = {
                              data: roles,
                              current: queryParams.page,
                              pages: queryParams.page,
                              totalrecords: count
                          }
                          generateResponse(true, "Fetch Roles", data, res);
                      }
                  });
  
              });
          });

    }
    catch (e) {

        console.log(e);
        generateResponse(false, "Unable to Fetch Roles", null, res);

    }

}
export async function deleteRole(req, res) {

    let roleid = decryptValue(req.query.id);

    let employees_count = await Employee.countEmployee({ roleid: roleid });
    if (employees_count > 0) {
        generateResponse(false, 'Unable to delete Role, Users Exists', null, res);
    }
    else {
        Role.deleteRole(roleid, (err, update) => {
            console.log(update);
            if (err) {
                generateResponse(false, 'Unable to delete Role', null, res);
            }
            generateResponse(true, 'Role Deleted Successfully', null, res);
        });
    }
}
export function updateRole(req, res) {

    let updateBody = parseBody(req);
    console.log(updateBody);
    Role.updateRole(updateBody, (err, update) => {
        console.log(update);

        if (err) {
            generateResponse(false, 'Unable to update Role', null, res);
        }
        generateResponse(true, 'Role Updated', null, res);
    });
}

export function getSpecificRole(req, res) {

    let roleid = decryptValue(req.params.id);

    Role.getSpecificRole({ _id: roleid }, (err, role) => {
        if (err) {
            console.log(err.message);
            generateResponse(false, 'Unable to Fetched Speicific Role', null, res);
        }
        generateResponse(true, 'Fetched Speicific Role', role, res);
    });
}
