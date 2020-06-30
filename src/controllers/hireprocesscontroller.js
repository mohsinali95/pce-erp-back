import { parseBody, generateResponse } from '../utilites';
import HireRequest from '../models/hirerequests';
import Department from '../models/department';
import { decryptValue } from '../utilites/encryption-module';
import _ from 'lodash';
import { REQUEST_TYPE, REQUEST_STATUS } from '../utilites/constants';
import {initiatePriorityIndex} from './requestprocesscontroller';
import async from 'async';

/* REQUEST TYPE -> 0 = Hiring Process */

export function createNewHiringRequest(req, res) {
    console.time('st');
    let body = parseBody(req);
    let createRequest = {};


    HireRequest.countHiringRequests({}, function (err, requestsCount) {

        Department.getSpecificDepartment({ _id: body['department'] }, (err, departmentDetails) => {

            departmentDetails = departmentDetails[0];
            console.log(departmentDetails['requestline']);

            let hiringRequestReportline = departmentDetails['requestline'].find(o => o.request_type === REQUEST_TYPE[0]);

            if(hiringRequestReportline.priority_order.length == 0){

                generateResponse(false, "Sorry No Manager Exist in Hiring Reportline", null, res);
            }
            else{

                let priority_index = initiatePriorityIndex(hiringRequestReportline.priority_order);
               
                console.log('Assign to: ', priority_index);
                createRequest['job_id'] = `JD-${requestsCount + 1}`;
                createRequest['title'] = body['title'];
                createRequest['description'] = body['description'];
                createRequest['department'] = body['department'];
                createRequest['generated_by'] = req.payload._id;
                createRequest['request_next_order'] = priority_index;
                createRequest['extra_fields'] = body['extra_fields']
    
                HireRequest.addHiringRequest(createRequest, function (err, result) {
                    if (err) {
                        console.log(err);
                        generateResponse(false, "Unable to Create Hiring Request", null, res);
                    }
                    console.timeEnd('st');
                    generateResponse(true, "Successfully Created Hiring Request", result, res);
                });

            }

           
           
        });
    });
}

export function countRequests(req, res) {

    let body = parseBody(req);

    let query = {
        request_status: body.request_status
    };

    console.log(query);

    HireRequest.countHiringRequests(query, (err, count) => {
        if (err) {
            console.log(err);
            generateResponse(false, "Unable to Count Hiring Requests", null, res);
        }
        generateResponse(true, "Successfully Counted Hiring Requests", count, res);

    });

}
export function statusUpdateHiringRequest(req, res) {

    let body = parseBody(req);
    let userPayload = req.payload;
    let request_id = req.query['request_id'];
    console.log(request_id);
    let updateParam = {
        '_id': request_id
    };

    HireRequest.getSpecificHiringRequest({ '_id': request_id }, '', (err, response) => {

        const requestDetails = response[0];
        let status_log = requestDetails['status_log'];
        console.log('Request Department Id', requestDetails['department']['_id']);

        Department.getSpecificDepartment({ _id: requestDetails['department']['_id'] }, (err, department) => {


            let hiringRequestReportline = department[0]['requestline'].find(o => o.request_type === REQUEST_TYPE[0]);
            let priority_order_array = hiringRequestReportline['priority_order'];
            let requestToSend = priority_order_array[requestDetails['request_next_order'] - 1]['department']['manager']['_id'];

            console.log('c e', userPayload['_id']);
            console.log('p e', requestToSend);

            if (userPayload['_id'] == requestToSend && priority_order_array[requestDetails['request_next_order'] - 1]['status'] == true) {

                let request_current_order = requestDetails['request_next_order'];
                let request_next_order = 0;
                let updateData = {};
                let filteredPriorityOrderArray = priority_order_array.filter((item) => {
                    return item['status'] == true;
                });

                if (requestDetails['request_status'] == REQUEST_STATUS['pending']) {
                    if (body['request_status'] == REQUEST_STATUS['approved']) {
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
    
                            }
                            else {
                                updateData = {
                                    'request_status': REQUEST_STATUS['pending'],
                                    'request_next_order': request_next_order,
                                    $push: {
                                        'status_log': {
                                            'status': REQUEST_STATUS['pending'],
                                            'action_by': userPayload['_id'],
                                            'updated_at': new Date
                                        }
                                    }
                                };
    
                            }
                            HireRequest.updateHiringRequests(updateParam, updateData, (err, response) => {
    
                                if (err) {
                                    console.log(err);
                                    generateResponse(false, "Unable to Update Hiring Request", null, res);
                                }
                                generateResponse(true, "Successfully Updated Hiring Requests", response, res);
                            });
    
                        }
                    }

                    else if (body['request_status'] == REQUEST_STATUS['rejected']) {

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

                            /* generateResponse(true, "Successfully Updated Hiring Requests", updateData, res); */
    
                            HireRequest.updateHiringRequests(updateParam, updateData, (err, response) => {
    
                                if (err) {
                                    console.log(err);
                                    generateResponse(false, "Unable to Update Hiring Request", null, res);
                                }
                                generateResponse(true, "Successfully Updated Hiring Requests", response, res);
                            });
    
                        }
                    }
                    
                }
                else {

                    generateResponse(false, "Request is not on pending", null, res);
    
                }
            }
            else {
                generateResponse(false, "Unauthorized request", null, res);
            }
        });

    });

}

export function getHiringRequests(req, res) {

    let queryParams = {
        page: req.query.page || 1,
        limit: req.query.limit || 10,
        sort: req.query.sort,
        sortby: req.query.sortby,
        request_status: req.query.request_status
    };

    if (queryParams['request_status']) {
        queryParams['request_status'] = queryParams['request_status'].split(",");
    }

    HireRequest.getHiringRequests(queryParams, (err, hiringRequests) => {
        if (err) {
            console.log(err);
            generateResponse(false, "Unable to Fetch Hiring Requests", null, res);
        }
        let getDepReportlinetFunctions = [];
        hiringRequests.forEach(element => {

            const deptId = element['department']['_id'];
            /*  console.log('A', deptId); */
            getDepReportlinetFunctions.push((callback) => {

                Department.getSpecificDepartment({ _id: deptId }, (err, deptDetail) => {

                    if (err) return callback(err);


                    let hiringRequestReportline = deptDetail[0]['requestline'].find(o => o.request_type === REQUEST_TYPE[0]);
                    callback(null, hiringRequestReportline['priority_order']);

                });
            });

        });

        async.parallel(getDepReportlinetFunctions, (err, reportline) => {

            for (let i = 0; i < hiringRequests.length; i++) {
                hiringRequests[i]['requestline'] = reportline[i];
            }
            HireRequest.countHiringRequests(queryParams, function (err, count) {

                if (count != 0) {
                    let data = {
                        data: hiringRequests,
                        current: queryParams.page,
                        pages: Math.ceil(count / queryParams.limit),
                        totalrecords: count
                    }
                    generateResponse(true, "Fetch Hiring Requests", data, res);
                }
                else {

                    let data = {
                        data: hiringRequests,
                        current: queryParams.page,
                        pages: queryParams.page,
                        totalrecords: count
                    }
                    generateResponse(true, "Fetch Hiring Requests", data, res);
                }
            });
        });
    });
}

export function getApprovedHireRequests(req, res) {

    let queryParams = {
        page: req.query.page || 1,
        limit: req.query.limit || 10,

    };

    HireRequest.getApprovedHiringRequests(queryParams, (err, hiringRequests) => {
        if (err) {
            console.log(err);
            generateResponse(false, "Unable to Fetch Approved Hiring Requests", null, res);
        }
        HireRequest.countHiringRequests(queryParams, function (err, count) {

            if (count != 0) {
                let data = {
                    data: hiringRequests,
                    current: queryParams.page,
                    pages: Math.ceil(count / queryParams.limit),
                    totalrecords: count
                }
                generateResponse(true, "Fetched Approved Hiring Requests", data, res);
            }
            else {

                let data = {
                    data: hiringRequests,
                    current: queryParams.page,
                    pages: queryParams.page,
                    totalrecords: count
                }
                generateResponse(true, "Fetch Hiring Requests", data, res);
            }
        });
    });
}
export function deleteHiringRequests(req, res) {

    let hiringRequestId = req.query.id;
    let queryParam = {
        _id: hiringRequestId
    };
    HireRequest.deleteHiringRequest(queryParam, (err, update) => {

        console.log(update);
        if (err) {
            generateResponse(false, 'Unable to delete Hiring Requests', null, res);
        }
        generateResponse(true, 'Hiring Requests Deleted Successfully', null, res);

    });

}

export function getSpecificHireRequest(req, res) {



    let job_id = req.params['job_id'];

    HireRequest.getSpecificHiringRequest({ 'job_id': job_id }, '', (err, jobDetails) => {

        if (err) {
            generateResponse(false, 'Unable to fetch Hiring Request', null, res);
        }
        generateResponse(true, 'Hiring Requests fetch Successfully', jobDetails[0], res);
    });

}

export function getSpecificHireRequestWithSpecificDetails(req, res) {

    let job_id = req.query['job_id'];

    let selectedFields = 'title job_id description -_id'

    HireRequest.getSpecificHiringRequest({ 'job_id': job_id }, selectedFields, (err, jobDetails) => {

        if (err) {
            generateResponse(false, 'Unable to fetch Hiring Request', null, res);
        }
        generateResponse(true, 'Hiring Requests fetch Successfully', jobDetails[0], res);
    });

}

export function statusUpdateCloseHiringRequest(req, res) {

    let body = parseBody(req);
    let userPayload = req.payload;
    let request_id = req.query['request_id'];
    console.log(body);
    let updateParam = {
        '_id': request_id
    };

    HireRequest.getSpecificHiringRequest({ '_id': request_id }, '', (err, requestDetails) => {

        requestDetails = requestDetails[0];
        console.log('Request Department Id', requestDetails['department']['_id']);
       /*  let priority_order_array = requestDetails['request_order']['priority_order']; */
       /*  console.log(priority_order_array); */
        let updateData = {};
    
      
        Department.getSpecificDepartment({ _id: requestDetails['department']['_id'] }, (err, department) => {


            let hiringRequestReportline = department[0]['requestline'].find(o => o.request_type === REQUEST_TYPE[0]);
            let priority_order_array = hiringRequestReportline['priority_order'];
            let requestToSend = priority_order_array[requestDetails['request_next_order'] - 1]['department']['manager']['_id'];

            console.log('c e', userPayload['_id']);
            console.log('p e', requestToSend);

            if (userPayload['_id'] == requestToSend) {

                if (requestDetails['request_status'] == REQUEST_STATUS['approved']) {
                    if (body['request_status'] == REQUEST_STATUS['hired_close']) {
                        updateData = {
                            'request_status': body['request_status'],
                            $push: {
                                'status_log': {
                                    'status': body['request_status'],
                                    'action_by': userPayload['_id'],
                                    'updated_at': new Date
                                }
                            }
                        };
                    }
                    else if (body['request_status'] == REQUEST_STATUS['closed']) {
                        updateData = {
                            'request_status': body['request_status'],
                            'closing_reason': body['closing_reason'],
                            $push: {
                                'status_log': {
                                    'status': body['request_status'],
                                    'action_by': userPayload['_id'],
                                    'updated_at': new Date
                                }
                            }
                        };
                    }
                    HireRequest.updateHiringRequests(updateParam, updateData, (err, response) => {
                        if (err) {
                            console.log(err);
                            generateResponse(false, "Unable to Update Hiring Request", null, res);
                        }
                        generateResponse(true, "Successfully Updated Hiring Requests", response, res);
                    });

                }
                else {
                    generateResponse(true, "Hiring Request is on pending or already rejected, please check", null, res);
                }
            }
            else {
                generateResponse(false, "Unauthorized request", null, res);
            }
        });
    });
}
