import { parseBody, generateResponse } from '../utilites';
import { REQUEST_TYPE, ADV_REQUEST_STATUS, PAYROLE_START_DATE, ADVANCE_STATUS } from '../utilites/constants';
import AdvanceRequest from '../models/advancerequest';
import Department from '../models/department';
import EmployeeAdvance from '../models/employeeadvance';
import _ from 'lodash';
import async from 'async';
import moment from 'moment';
import { initiatePriorityIndex } from './requestprocesscontroller';

/* REQUEST TYPE -> 4 = Advance */

export async function createNewAdvRequest(req, res) {
    try {

        let body = parseBody(req);
        let createRequest = {};


        Department.getSpecificDepartment({ _id: body['department'] }, async (err, departmentDetails) => {

            departmentDetails = departmentDetails[0];
            let AdvRequestReportline = departmentDetails['requestline'].find(o => o.request_type === REQUEST_TYPE[4]);

            if (AdvRequestReportline.priority_order.length == 0) {
                generateResponse(false, "Sorry No Manager Exist in Advance Reportline", null, res);
            }
            else {
                let priority_index = initiatePriorityIndex(AdvRequestReportline.priority_order);
                console.log(getMonthYearOfAdvance(body['applied_date']))
                createRequest['employee'] = body['employee'];
                createRequest['advance_amount'] = body['advance_amount'];
                createRequest['reason'] = body['reason'];
                createRequest['applied_date'] = body['applied_date'];
                createRequest['department'] = body['department'];
                createRequest['advance_for'] = getMonthYearOfAdvance(body['applied_date']);
                createRequest['request_next_order'] = priority_index;
                createRequest['generated_by'] = req.payload._id;

                let creation = await AdvanceRequest.createAdvRequest(createRequest);

                generateResponse(true, "advance request created successfully", creation, res);
            }
        });

    } catch (error) {

        console.log(error);
        generateResponse(false, "unable to create request", null, res);

    }

}

export async function countAdvRequests(req, res) {

    try {

        let body = parseBody(req);

        let query = {
            request_status: body.request_status
        };
        console.log(query);
        let count = await AdvanceRequest.countAdvRequests(query);
        generateResponse(true, "successfully counted advance requests", count, res);

    }
    catch (e) {

        console.log(e);
        generateResponse(false, "unable to get count", null, res);
    }
}


export async function getAdvRequests(req, res) {

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

        let requests = await AdvanceRequest.getAdvRequests(queryParams);

        let getDepReportlinetFunctions = [];
        requests.forEach(element => {

            const deptId = element['department']['_id'];
            getDepReportlinetFunctions.push((callback) => {

                Department.getSpecificDepartment({ _id: deptId }, (err, deptDetail) => {

                    if (err) return callback(err);
                    let reportingLine = deptDetail[0]['requestline'].find(o => o.request_type === REQUEST_TYPE[4]);
                    callback(null, reportingLine['priority_order']);

                });
            });

        });

        async.parallel(getDepReportlinetFunctions, async (err, reportline) => {

            for (let i = 0; i < requests.length; i++) {
                requests[i]['requestline'] = reportline[i];
            }
            console.log(requests);
            let count = await AdvanceRequest.countAdvRequests(queryParams);

            if (count != 0) {
                let data = {
                    data: requests,
                    current: queryParams.page,
                    pages: Math.ceil(count / queryParams.limit),
                    totalrecords: count
                }
                generateResponse(true, "fetch advance requests", data, res);
            }
            else {

                let data = {
                    data: requests,
                    current: queryParams.page,
                    pages: queryParams.page,
                    totalrecords: count
                }
                generateResponse(true, "fetch advance requests", data, res);
            }

        });
    } catch (error) {

        console.log(error)
        generateResponse(false, "unable to fetch requests", null, res);

    }
}

export async function getSpecificAdvRequest(req, res) {

    let advrequestid = req.params['advrequestid'];

    try {
        let advrequest = await AdvanceRequest.getSpecificAdvRequest({ _id: advrequestid });
        generateResponse(true, "request fetched successfully", advrequest, res);
    }
    catch (e) {

        console.log(e);
        generateResponse(false, "unable to fetch request", null, res);
    }

}

export async function deleteAdvRequest(req, res) {

    try {
        let advrequestid = req.params['advrequestid'];
        let queryParam = {
            _id: advrequestid
        };
       
        let deletion = await AdvanceRequest.deleteAdvRequest(queryParam);
        generateResponse(true, 'requests deleted successfully', deletion, res);

    } catch (error) {
        generateResponse(false, 'unable to delete request', null, res);
    }



}

export async function updateStatusAdvRequest(req, res) {

    try {
        let body = parseBody(req);
        let userPayload = req.payload;
        let request_id = req.query['request_id'];



        let updateParam = {
            '_id': request_id
        };

        let requestAdvDetails = await AdvanceRequest.getSpecificAdvRequest(updateParam);
        requestAdvDetails = requestAdvDetails[0];
        let status_log = requestAdvDetails['status_log'];
        console.log(requestAdvDetails['department']['_id']);

        let deptDetails = await Department.getSpecificDepartmentV2({ _id: requestAdvDetails['department']['_id'] });
        deptDetails = deptDetails[0];

        let advRequestReportline = deptDetails['requestline'].find(o => o.request_type === REQUEST_TYPE[4]);

        let priority_order_array = advRequestReportline['priority_order'];
        let requestToSend = priority_order_array[requestAdvDetails['request_next_order'] - 1]['department']['manager']['_id'];

        console.log('c e', userPayload['_id']);
        console.log('p e', requestToSend);

        if (userPayload['_id'] == requestToSend && priority_order_array[requestAdvDetails['request_next_order'] - 1]['status'] == true) {

            let request_current_order = requestAdvDetails['request_next_order'];
            let request_next_order = 0;
            let updateData = {};
            let filteredPriorityOrderArray = priority_order_array.filter((item) => {
                return item['status'] == true;
            });

            if (requestAdvDetails['request_status'] == ADV_REQUEST_STATUS['pending']) {

                if (body['request_status'] == ADV_REQUEST_STATUS['approved']) {

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

                            let updateAdvData = {

                                approved_date: new Date,
                                issued_date: new Date,
                                employee: requestAdvDetails['employee']['_id'],
                                advance_status : ADVANCE_STATUS['open'],
                                advance_request: requestAdvDetails['_id'],
                                advance_for: requestAdvDetails['advance_for'],
                                advance_amount : requestAdvDetails['advance_amount'],

                            }

                            let AdvCreation = await EmployeeAdvance.addEmployeeAdv(updateAdvData);
                            let updation = await AdvanceRequest.updateAdvRequest(updateParam, updateData);

                            /* generateResponse(false, 'test---', updateAdvData, res); */

                            console.log('Create Adv', AdvCreation);
                            console.log('Update Adv Request', updation);
                            let is_approved_check = {

                                is_approved: true

                            };
                            generateResponse(true, 'successfully updated request', is_approved_check, res);

                        }
                        else {
                            updateData = {
                                'request_status': ADV_REQUEST_STATUS['pending'],
                                'request_next_order': request_next_order,
                                $push: {
                                    'status_log': {
                                        'status': ADV_REQUEST_STATUS['pending'],
                                        'action_by': userPayload['_id'],
                                        'updated_at': new Date
                                    }
                                }
                            };


                            let updation = await AdvanceRequest.updateAdvRequest(updateParam, updateData);
                            console.log(updation);
                            let is_approved_check = {
                                is_approved: false
                            };
                            generateResponse(true, 'successfully updated request', is_approved_check, res);

                        }

                       /*   */
                    }

                }

                else if (body['request_status'] == ADV_REQUEST_STATUS['rejected']) {

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
                        let updation = await AdvanceRequest.updateAdvRequest(updateParam, updateData);
                        generateResponse(true, 'successfully updated request', updation, res);
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



        
    }
    catch (error) {
        console.log(error);
        generateResponse(false, 'unable to update request', null, res);
    }

}


/* General Functions */

function getMonthYearOfAdvance(applied_date) {


    let tempDate = new Date(applied_date);
    let date = tempDate.getDate();
    let month = tempDate.getMonth();
    let year = tempDate.getFullYear();

    console.log(typeof date);
    console.log(typeof PAYROLE_START_DATE);

    let advance_for = {};

    if (date >= PAYROLE_START_DATE) {

        console.log("On Next Month");
        month += 1;
        if (month === 12) {

            date = new Date(year, month, 1);
            month = date.getMonth();
            year = date.getFullYear()

        }
        advance_for = { month, year }
    }
    else {
        console.log("Current Month");
        advance_for = { month, year }
    }

    return advance_for;

}