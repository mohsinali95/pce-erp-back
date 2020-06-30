import { parseBody, generateResponse } from '../utilites';
import { REQUEST_TYPE, FINE_REQUEST_STATUS, ADVANCE_STATUS, FINE_STATUS } from '../utilites/constants';
import FineRequest from '../models/finerequest';
import Department from '../models/department';
import EmployeeFine from '../models/employeefine';
import _ from 'lodash';
import async from 'async';
import moment from 'moment';
import { initiatePriorityIndex } from './requestprocesscontroller';
import fs from 'fs';

/* REQUEST TYPE -> 5 = Fine */

export async function createNewFineRequest(req, res) {
    try {

        let body = parseBody(req);
        let createRequest = {};

        Department.getSpecificDepartment({ _id: body['department'] }, async (err, departmentDetails) => {

            departmentDetails = departmentDetails[0];
            let FineRequestReportline = departmentDetails['requestline'].find(o => o.request_type === REQUEST_TYPE[5]);

            if (FineRequestReportline.priority_order.length == 0) {
                generateResponse(false, "Sorry No Manager Exist in Advance Reportline", null, res);
            }
            else {
                let priority_index = initiatePriorityIndex(FineRequestReportline.priority_order);
                
                createRequest['employee'] = body['employee'];
                createRequest['fine_type'] = body['fine_type'];
                createRequest['fine_amount'] = body['fine_amount'];
                createRequest['reason'] = body['reason'];
                createRequest['applied_date'] = body['applied_date'];
                createRequest['department'] = body['department'];
                createRequest['request_next_order'] = priority_index;
                createRequest['generated_by'] = req.payload._id;

                let creation = await FineRequest.createFineRequest(createRequest);
                generateResponse(true, "fine request created successfully", creation, res);
            }
        });

    } catch (error) {

        console.log(error);
        generateResponse(false, "unable to create request", null, res);

    }

}


export async function countFineRequests(req, res) {

    try {

        let body = parseBody(req);

        let query = {
            request_status: body.request_status
        };
        console.log(query);
        let count = await FineRequest.countFineRequests(query);
        generateResponse(true, "successfully counted fine requests", count, res);

    }
    catch (e) {

        console.log(e);
        generateResponse(false, "unable to get count", null, res);
    }
}

export async function getFineRequests(req, res) {

    try {
        let queryParams = {
            page: req.query.page || 1,
            limit: req.query.limit || 10,
            sort: req.query.sort,
            sortby: req.query.sortby,
            request_status: req.query.request_status,

        };

        if (queryParams['request_status']) {
            queryParams['request_status'] = queryParams['request_status'].split(",");
        }

        let requests = await FineRequest.getFineRequests(queryParams);

        let getDepReportlinetFunctions = [];
        requests.forEach(element => {

            const deptId = element['department']['_id'];
            getDepReportlinetFunctions.push((callback) => {

                Department.getSpecificDepartment({ _id: deptId }, (err, deptDetail) => {

                    if (err) return callback(err);
                    let reportingLine = deptDetail[0]['requestline'].find(o => o.request_type === REQUEST_TYPE[5]);
                    callback(null, reportingLine['priority_order']);

                });
            });

        });

        async.parallel(getDepReportlinetFunctions, async (err, reportline) => {

            for (let i = 0; i < requests.length; i++) {
                requests[i]['requestline'] = reportline[i];
            }
            console.log(requests);
            let count = await FineRequest.countFineRequests(queryParams);

            if (count != 0) {
                let data = {
                    data: requests,
                    current: queryParams.page,
                    pages: Math.ceil(count / queryParams.limit),
                    totalrecords: count
                }
                generateResponse(true, "fetch fine requests", data, res);
            }
            else {

                let data = {
                    data: requests,
                    current: queryParams.page,
                    pages: queryParams.page,
                    totalrecords: count
                }
                generateResponse(true, "fetch fine requests", data, res);
            }

        });
    } catch (error) {

        console.log(error)
        generateResponse(false, "unable to fetch requests", null, res);

    }
}


export async function getSpecificFineRequest(req, res) {

    let finerequestid = req.params['finerequestid'];

    try {
        let finerequest = await FineRequest.getSpecificFineRequest({ _id: finerequestid });
        generateResponse(true, "request fetched successfully", finerequest, res);
    }
    catch (e) {

        console.log(e);
        generateResponse(false, "unable to fetch request", null, res);
    }

}

export async function deleteFineRequest(req, res) {

    try {
        let finerequestid = req.params['finerequestid'];
        let queryParam = {
            _id: finerequestid
        };

        let deletion = await FineRequest.deleteFineRequest(queryParam);
        generateResponse(true, 'requests deleted successfully', deletion, res);

    } catch (error) {
        generateResponse(false, 'unable to delete request', null, res);
    }

}

export async function updateStatusFineRequest(req, res) {

    try {
        let body = parseBody(req);
        let userPayload = req.payload;
        let request_id = req.query['request_id'];



        let updateParam = {
            '_id': request_id
        };

        let requestFineDetails = await FineRequest.getSpecificFineRequest(updateParam);
        requestFineDetails = requestFineDetails[0];
        let status_log = requestFineDetails['status_log'];
        console.log(requestFineDetails['department']['_id']);

        let deptDetails = await Department.getSpecificDepartmentV2({ _id: requestFineDetails['department']['_id'] });
        deptDetails = deptDetails[0];

        let fineRequestReportline = deptDetails['requestline'].find(o => o.request_type === REQUEST_TYPE[5]);

        let priority_order_array = fineRequestReportline['priority_order'];
        let requestToSend = priority_order_array[requestFineDetails['request_next_order'] - 1]['department']['manager']['_id'];

        console.log('c e', userPayload['_id']);
        console.log('p e', requestToSend);

        if (userPayload['_id'] == requestToSend && priority_order_array[requestFineDetails['request_next_order'] - 1]['status'] == true) {

            let request_current_order = requestFineDetails['request_next_order'];
            let request_next_order = 0;
            let updateData = {};
            let filteredPriorityOrderArray = priority_order_array.filter((item) => {
                return item['status'] == true;
            });


            if (requestFineDetails['request_status'] == FINE_REQUEST_STATUS['pending']) {

                if (body['request_status'] == FINE_REQUEST_STATUS['approved']) {

                    if (filteredPriorityOrderArray.length == status_log.length) {
                        generateResponse(true, "Requested has been Completed, No further Action needed", null, res);
                    }
                    else {

                        for (let i = request_current_order; i <= priority_order_array.length; i++) {
                            console.log('value of i', i);
                            if (filteredPriorityOrderArray.length == status_log.length + 1) {
                                console.log('if');
                                if (priority_order_array[i - 1]['status'] == true) {
                                    request_next_order = i;
                                }
                                else {
                                    request_next_order = request_current_order;
                                }
                            }
                            else {
                                console.log('else');
                                if (priority_order_array[i - 1]['status'] == true && request_current_order !== i) {
                                    request_next_order += i;
                                    break;
                                }

                            }
                        }
                        console.log('Next Order', request_next_order);
                        console.log('Current Order', request_current_order);

                        if (filteredPriorityOrderArray.length == status_log.length + 1) {

                            updateData = {
                                'request_status': body['request_status'],
                                'request_next_order': request_next_order,
                                $push: {
                                    'status_log': {
                                        'status': body['request_status'],
                                        'action_by': userPayload['_id'],
                                        'updated_at': new Date
                                    }
                                }
                            };

                            let updateFineData = {

                                approved_date: new Date,
                                employee: requestFineDetails['employee']['_id'],
                                fine_status : FINE_STATUS['pending'],
                                fine_request: requestFineDetails['_id'],
                                type : requestFineDetails['fine_type'],
                                amount : requestFineDetails['fine_amount'],
                                reason : requestFineDetails['reason']

                            }

                            let FineCreation = await EmployeeFine.addEmployeeFine(updateFineData);
                            let updation = await FineRequest.updateFineRequest(updateParam, updateData);

                            /* generateResponse(false, 'test---', updateAdvData, res); */

                            console.log('Create Adv', FineCreation);
                            console.log('Update Adv Request', updation);
                            let is_approved_check = {

                                is_approved: true

                            };
                            generateResponse(true, 'successfully updated request', is_approved_check, res);
                            
                        }
                        else{

                            updateData = {
                                'request_status': FINE_REQUEST_STATUS['pending'],
                                'request_next_order': request_next_order,
                                $push: {
                                    'status_log': {
                                        'status': FINE_REQUEST_STATUS['pending'],
                                        'action_by': userPayload['_id'],
                                        'updated_at': new Date
                                    }
                                }
                            };


                            let updation = await FineRequest.updateFineRequest(updateParam, updateData);
                            console.log(updation);
                            let is_approved_check = {
                                is_approved: false
                            };
                            generateResponse(true, 'successfully updated request', is_approved_check, res);

                        }



                        

                    }

                }


                else if (body['request_status'] == FINE_REQUEST_STATUS['rejected']) {

                    if (filteredPriorityOrderArray.length == status_log.length) {
                        generateResponse(true, "Requested has been Completed, No further Action needed", null, res);
                    }
                    else {

                        updateData = {
                            'request_status': body['request_status'],
                            'request_next_order': request_current_order,
                            $push: {
                                'status_log': {
                                    'status': body['request_status'],
                                    'action_by': userPayload['_id'],
                                    'updated_at': new Date
                                }
                            }
                        };
                        updateData['closing_reason'] = body['closing_reason'];
                        let updation = await FineRequest.updateFineRequest(updateParam, updateData);
                        generateResponse(true, 'successfully updated request', updation, res);
                    }


                }


            }

            else {
                generateResponse(false, "Request is not on pending", null, res);
            }

           


        }
        else {
            generateResponse(false, "unauthorized request", null, res);
        }



        
    }
    catch (error) {
        console.log(error);
        generateResponse(false, 'unable to update request', null, res);
    }

}
