import { parseBody, generateResponse, getPublicEmployeeGuarantorFilePath } from '../utilites';
import { REQUEST_TYPE, LOAN_REQUEST_STATUS, LOAN_STATUS } from '../utilites/constants';
import LoanRequest from '../models/loanrequest';
import Department from '../models/department';
import EmployeeLoan from '../models/employeeloan';
import _ from 'lodash';
import async from 'async';
import { initiatePriorityIndex } from './requestprocesscontroller';
/* REQUEST TYPE -> 3 = Loan */

export async function createNewLoanRequest(req, res) {

    let body = parseBody(req);
    let employee_number = body['employee_number'];

    try {
        let createRequest = {};

        Department.getSpecificDepartment({ _id: body['department'] }, async (err, departmentDetails) => {

            departmentDetails = departmentDetails[0];
            let loanRequestReportline = departmentDetails['requestline'].find(o => o.request_type === REQUEST_TYPE[3]);

            if (loanRequestReportline.priority_order.length == 0) {
                generateResponse(false, "Sorry No Manager Exist in Loan Reportline", null, res);
            }
            else {
                let front_cnic_file = req.files['front_cnic'][0];
                let back_cnic_file = req.files['back_cnic'][0];
                let priority_index = initiatePriorityIndex(loanRequestReportline.priority_order);
                console.log('Assign to: ', priority_index);

                let guarantorDetails = {

                    firstname: body['firstname'],
                    lastname: body['lastname'],
                    cnic: body['cnic'],
                    contact: body['contact'],
                    address: body['address'],
                    front_cnic: getPublicEmployeeGuarantorFilePath(employee_number, front_cnic_file['filename']),
                    back_cnic: getPublicEmployeeGuarantorFilePath(employee_number, back_cnic_file['filename'])
                }

                createRequest['loan_type'] = body['loan_type'];
                createRequest['loan_date'] = body['loan_date'];
                createRequest['loan_amount'] = body['loan_amount'];
                createRequest['reason'] = body['reason'];
                createRequest['number_of_months'] = body['number_of_months'];
                createRequest['installments'] = JSON.parse(body['installments']);
                createRequest['guarantor'] = guarantorDetails;
                createRequest['employee'] = body['employee'];
                createRequest['department'] = body['department'];
                createRequest['request_next_order'] = priority_index;
                createRequest['generated_by'] = req.payload._id;

                let creation = await LoanRequest.addLoanRequest(createRequest);
                generateResponse(true, "loan request created successfully", creation, res);


            }
        });

    }
    catch (e) {

        console.log(e);
        generateResponse(false, "unable to create request", null, res);


    }
}

export async function countLoanRequests(req, res) {

    try {

        let body = parseBody(req);

        let query = {
            request_status: body.request_status
        };
        console.log(query);
        let count = await LoanRequest.countLoanRequests(query);
        generateResponse(true, "successfully counted loan requests", count, res);

    }
    catch (e) {

        console.log(e);
        generateResponse(false, "unable to get count", null, res);


    }
}


export async function getLoanRequests(req, res) {

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

        let requests = await LoanRequest.getLoanRequests(queryParams);

        let getDepReportlinetFunctions = [];
        requests.forEach(element => {

            const deptId = element['department']['_id'];
            getDepReportlinetFunctions.push((callback) => {

                Department.getSpecificDepartment({ _id: deptId }, (err, deptDetail) => {

                    if (err) return callback(err);
                    let reportingLine = deptDetail[0]['requestline'].find(o => o.request_type === REQUEST_TYPE[3]);

                    /*  console.log(reportingLine); */
                    callback(null, reportingLine['priority_order']);

                });
            });

        });

        async.parallel(getDepReportlinetFunctions, async (err, reportline) => {

            for (let i = 0; i < requests.length; i++) {
                requests[i]['requestline'] = reportline[i];
            }


            console.log(requests);


            let count = await LoanRequest.countLoanRequests(queryParams);

            if (count != 0) {
                let data = {
                    data: requests,
                    current: queryParams.page,
                    pages: Math.ceil(count / queryParams.limit),
                    totalrecords: count
                }
                generateResponse(true, "fetch loan requests", data, res);
            }
            else {

                let data = {
                    data: requests,
                    current: queryParams.page,
                    pages: queryParams.page,
                    totalrecords: count
                }
                generateResponse(true, "fetch loan requests", data, res);
            }

        });
    } catch (error) {

        console.log(error)
        generateResponse(false, "unable to fetch requests", null, res);

    }
}

export async function getSpecificLoanRequest(req, res) {

    let loanrequestid = req.params['loanrequestid'];

    try {
        let loanrequest = await LoanRequest.getSpecificLoanRequest({ _id: loanrequestid });
        generateResponse(true, "request fetched successfully", loanrequest, res);
    }
    catch (e) {

        console.log(e);
        generateResponse(false, "unable to fetch request", null, res);
    }

}

export async function deleteLoanRequest(req, res) {

    try {
        let loanrequestid = req.params['loanrequestid'];
        let queryParam = {
            _id: loanrequestid
        };

        let deletion = await LoanRequest.deleteLoanRequest(queryParam);
        generateResponse(true, 'requests deleted successfully', deletion, res);

    } catch (error) {
        generateResponse(false, 'unable to delete request', null, res);
    }
}


export async function updateStatusLoanRequest(req, res) {

    try {
        let body = parseBody(req);
        let userPayload = req.payload;
        let request_id = req.query['request_id'];

        /* console.log(request_id); */
        let updateParam = {
            '_id': request_id
        };
        /* console.log('Body', body); */


        let requestLoanDetails = await LoanRequest.getSpecificLoanRequest(updateParam);
        requestLoanDetails = requestLoanDetails[0];
        let status_log = requestLoanDetails['status_log'];
        console.log(requestLoanDetails['department']['_id']);

        let deptDetails = await Department.getSpecificDepartmentV2({ _id: requestLoanDetails['department']['_id'] });
        deptDetails = deptDetails[0];

        let loanRequestReportline = deptDetails['requestline'].find(o => o.request_type === REQUEST_TYPE[3]);

        let priority_order_array = loanRequestReportline['priority_order'];
        let requestToSend = priority_order_array[requestLoanDetails['request_next_order'] - 1]['department']['manager']['_id'];

        console.log('c e', userPayload['_id']);
        console.log('p e', requestToSend);

        if (userPayload['_id'] == requestToSend && priority_order_array[requestLoanDetails['request_next_order'] - 1]['status'] == true) {


            let request_current_order = requestLoanDetails['request_next_order'];
            let request_next_order = 0;
            let updateData = {};
            let filteredPriorityOrderArray = priority_order_array.filter((item) => {
                return item['status'] == true;
            });

            if (requestLoanDetails['request_status'] == LOAN_REQUEST_STATUS['pending']) {
                if (body['request_status'] == LOAN_REQUEST_STATUS['approved']) {

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


                            let updateLoanData = {

                                approved_date: new Date,
                                issued_date: new Date,
                                employee: requestLoanDetails['employee']['_id'],
                                installments: requestLoanDetails['installments'],
                                loan_amount: {
                                    total: requestLoanDetails['loan_amount'],
                                    paid: 0
                                },
                                loan_status: LOAN_STATUS['active'],
                                loan_request: requestLoanDetails['_id'],
                                return_amount_logs: []

                            }

                            let loanCreation = await EmployeeLoan.addEmployeeLoan(updateLoanData);
                            let updation = await LoanRequest.updateLoanRequest(updateParam, updateData);

                            console.log('Create Loan', loanCreation);
                            console.log('Update Loan Request', updation);
                            let is_approved_check = {

                                is_approved: true

                            };
                            generateResponse(true, 'successfully updated request', is_approved_check, res);
                        }
                        else {
                            updateData = {
                                'request_status': LOAN_REQUEST_STATUS['pending'],
                                'request_next_order': request_next_order,
                                $push: {
                                    'status_log': {
                                        'status': LOAN_REQUEST_STATUS['pending'],
                                        'action_by': userPayload['_id'],
                                        'updated_at': new Date
                                    }
                                }
                            };


                            let updation = await LoanRequest.updateLoanRequest(updateParam, updateData);
                            console.log(updation);
                            let is_approved_check = {
                                is_approved: false
                            };
                            generateResponse(true, 'successfully updated request', is_approved_check, res);

                        }
                    }


                }
                else if (body['request_status'] == LOAN_REQUEST_STATUS['rejected']) {

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
                        let updation = await LoanRequest.updateLoanRequest(updateParam, updateData);
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



    } catch (error) {
        console.log(error);
        generateResponse(false, 'unable to update request', null, res);
    }


}