'use strict';

import { Router } from "express";
/* import multer from 'multer'; */
import { log, loggedIn, multerMiddleware, accessControl } from "../middlewares";
import {
    addUnit,
    getUnit,
    updateUnit,
    updateUnitConfiguration,
    deleteUnit,
    getSpecificUnit,
    checkUnitExist
} from '../controllers/unitcontroller';
import {
    addDepartment,
    getDepartment,
    updateDepartment,
    updateDepartmentManager,
    deleteDepartment,
    getSpecificDepartment,
    updateReportingLine,
    updateParentDeptFlag
} from '../controllers/departmentcontroller';
import {
    addEmployee,
    updateEmploymentDetails,
    updateDocumentDetails,
    updateEmployeeEmergencyContact,
    updateChildrenDetails,
    updateEmployeeAddress,
    updateProfessionalExp,
    updateEducationDetails,
    updateMartialDetails,
    updateRelationalDetails,
    getEmployee,
    deleteEmployee,
    getSpecificEmployee,
    updateEmployeeBasicDetails,
    updateProfileImage,
    updateBenefitDetails,
    updateEmployeeStatus,
    isCheckEmployeeExist,
    addJobCandidates,
    updateHiringInterviewDetails,
    createEmployeeLeavetype,
    getEmploymentLogs
} from '../controllers/employeecontroller';
/* import { addRequestLine, getRequestlines, getSpecificRequestline, updateRequestline, deleteRequestline } from "../controllers/requestlinecontroller"; */
import {
    createNewHiringRequest,
    countRequests,
    deleteHiringRequests,
    getHiringRequests,
    statusUpdateHiringRequest,
    getApprovedHireRequests,
    getSpecificHireRequestWithSpecificDetails,
    getSpecificHireRequest,
    statusUpdateCloseHiringRequest
} from '../controllers/hireprocesscontroller';

import {
    createNewTranferRequest,
    countTransferRequests,
    getTransferRequests,
    updateStatusTransferRequest,
    getSpecificTransferRequest,
    employeeTransferSearch,
    getTransferRequestPrint,
    getTransferRequestsV2
} from '../controllers/transferrequestcontroller';
import {
    generateLeaveRequest,
    countLeaveRequests,
    deleteLeaveRequests,
    updateStatusLeaveRequest,
    getLeaveRequests,
    getSpecificLeaveRequest,
    getLeaveRequestPrint,
    getLeaveRequestsV2
} from '../controllers/leaverequestcontroller';
import { getAllUserDocuments, getStaticJsonData } from '../controllers/devcontroller';
import {
    getEmployeeAttendance,
    addEmployeeAttendance,
    createAttendanceMonthEmployee,
    generateAttendanceReport,
    createEmployeeInAttendance,
    processEmployeeAttendanceTimes,
    getEmployeeTimeAttendances
} from '../controllers/attendancecontroller';
import {
    generateAttendanceChangeRequest,
    getAllAttendanceChangeRequests,
    updateAttendanceRequest
} from "../controllers/attendancechangerequestcontroller";
import { enrollEmployeeFingerprint, getSpecificEmployeeFingerprintData, createEmployeeFingerprint } from "../controllers/fingerprintcontroller";
import { addEmployeeAttendanceTemp, addEmployeeAttendanceDayCron } from "../controllers/machineattendancecontroller";
import { createDesignation, getAllDesignations, deleteDesignation, updateDesignation } from "../controllers/desginationcontroller";
import { addAttendanceLogData, getAttendanceLog } from "../controllers/attendancelogcontroller";
import Employee from '../models/employee';


export default class HRAPI {
    constructor() {
        this.router = Router();
        this.registerRoutes();
    }
    registerRoutes() {
        let router = this.router;
        router.get("/deleteData", async (req, res) => {
            let regexPattern = "^[0-9]+$"
            let employees = await Employee.deleteMany({'employment_details.employee_number': { $regex: regexPattern, $ne: "000" }})
            res.send({length: employees.length, employees})
        })

        /* Units */
        router.post('/unit', log, loggedIn, accessControl, addUnit);
        router.put('/unit/config', log, loggedIn, updateUnitConfiguration)
        router.get('/unit', log, loggedIn, getUnit);
        router.get('/unit/:id', log, loggedIn, getSpecificUnit)
        router.put('/unit', log, loggedIn, accessControl, updateUnit);
        router.delete('/unit', log, loggedIn, accessControl, deleteUnit);
        router.post('/check/unit/exist', log, checkUnitExist)

        /* Departments */
        router.post('/department', log, loggedIn, addDepartment);
        router.get('/department', log, loggedIn, getDepartment);
        router.get('/department/:id', log, loggedIn, getSpecificDepartment);
        router.put('/department', log, loggedIn, updateDepartment);
        router.put('/department/manager', log, loggedIn, updateDepartmentManager);
        router.put('/department/requestline', log, loggedIn, updateReportingLine);
        router.put('/department/set/parent', log, loggedIn, updateParentDeptFlag);
        router.delete('/department', log, loggedIn, deleteDepartment);
        /* Employees */
        router.get('/employee', log, loggedIn, getEmployee);
        router.get('/employee/:id', log, loggedIn, getSpecificEmployee);
        router.get('/employee/employment/logs', log, loggedIn, getEmploymentLogs);
        router.post('/employee', log, loggedIn, multerMiddleware, addEmployee);
        router.put('/employee/basic_details', log, loggedIn, updateEmployeeBasicDetails);
        router.put('/employee/status', log, loggedIn, updateEmployeeStatus);
        router.put('/employee/benefit_details', log, loggedIn, updateBenefitDetails);
        router.put('/employee/profile_image', log, loggedIn, multerMiddleware, updateProfileImage);
        router.put('/employee/emergency_contacts', log, loggedIn, multerMiddleware, updateEmployeeEmergencyContact);
        router.put('/employee/address', log, loggedIn, updateEmployeeAddress);
        router.put('/employee/professional_experience', log, loggedIn, multerMiddleware, updateProfessionalExp);
        router.put('/employee/employment_details', log, loggedIn, multerMiddleware, updateEmploymentDetails);
        router.put('/employee/education_details', log, loggedIn, multerMiddleware, updateEducationDetails);
        router.put('/employee/doc_details', log, loggedIn, multerMiddleware, updateDocumentDetails);
        router.put('/employee/family/martial_details', log, loggedIn, multerMiddleware, updateMartialDetails);
        router.put('/employee/family/family_members', log, loggedIn, multerMiddleware, updateRelationalDetails);
        router.put('/employee/family/children_details', log, loggedIn, multerMiddleware, updateChildrenDetails);
        router.delete('/employee', log, loggedIn, deleteEmployee);
        /* Attendance */
        router.get('/attendance', log, loggedIn, getEmployeeAttendance);
        router.post('/attendance', log, loggedIn, addEmployeeAttendance);
        router.put('/attendance/month/add', log, createAttendanceMonthEmployee);
        router.post('/attendance/report', log, loggedIn, generateAttendanceReport);
        // router.post('/attendance/report', log, loggedIn, (req,res)=>{
        //     console.log(req.body)
        // });

        router.post('/attendance/employee/create', log, createEmployeeInAttendance);
        router.post('/attendance/employee/times', log, processEmployeeAttendanceTimes);
        router.post('/attendance/employee/times/attendances', log, getEmployeeTimeAttendances);


        /* From Machine Attendance */
        router.post('/fingerprint/attendance/temporary', log, addEmployeeAttendanceTemp);
        router.post('/fingerprint/is/transfer/exist', log, employeeTransferSearch);
        router.post('/fingerprint/attendance/current/day', log, addEmployeeAttendanceDayCron);
        /* Attendance Change Request */
        router.post('/attendance/change', log, loggedIn, generateAttendanceChangeRequest);
        router.get('/attendance/change', log, loggedIn, getAllAttendanceChangeRequests);
        router.put('/attendance/change', log, loggedIn, updateAttendanceRequest);

        /* Attendance Logs */
        router.post('/attendance/log', log, addAttendanceLogData);
        router.get('/attendance/log', log, getAttendanceLog);

        
        /* Enroll */
        router.post('/fingerprint/machine/enroll', enrollEmployeeFingerprint);
        router.get('/fingerprint/machine/:id', log, getSpecificEmployeeFingerprintData);
        router.post('/fingerprint/machine/employee/add', createEmployeeFingerprint);

        /* Request Line */
        /*  router.post('/requestline', log, loggedIn, addRequestLine);
         router.get('/requestline', log, loggedIn, getRequestlines);
         router.get('/requestline/:id', log, loggedIn, getSpecificRequestline);
         router.put('/requestline', log, loggedIn, updateRequestline);
         router.delete('/requestline', log, loggedIn, deleteRequestline); */

        /* Hiring Requests */
        router.post('/hire/request/generate', log, loggedIn, createNewHiringRequest);
        router.post('/hire/request/count', log, loggedIn, countRequests);
        router.delete('/hire/request/delete', log, loggedIn, deleteHiringRequests);
        router.get('/hire/request', log, loggedIn, getHiringRequests);
        router.get('/hire/request/:job_id', log, loggedIn, getSpecificHireRequest);
        router.put('/hire/request/status/update', log, loggedIn, statusUpdateHiringRequest);
        router.post('/hire/request/candidate/add', log, loggedIn, multerMiddleware, addJobCandidates);
        router.put('/hire/request/candidate/interview', log, loggedIn, updateHiringInterviewDetails);
        router.put('/hire/request/status/update/close', log, loggedIn, statusUpdateCloseHiringRequest)
        /* Hiring Requests APIs for Website */
        router.get('/hire/request/approve', log, getApprovedHireRequests);
        router.get('/hire/request/specific', log, getSpecificHireRequestWithSpecificDetails);
        router.post('/employee/check', log, isCheckEmployeeExist);
        /* Leave Requests */
        router.post('/leave/request/create/type', log, loggedIn, createEmployeeLeavetype);
        router.post('/leave/request/generate', log, loggedIn, generateLeaveRequest);
        router.post('/leave/request/count', log, loggedIn, countLeaveRequests);
        router.get('/leave/request', log, loggedIn, getLeaveRequests);
        router.get('/leave/request/v2', log, loggedIn, getLeaveRequestsV2);
        router.get('/leave/request/:leaverequestid', log, loggedIn, getSpecificLeaveRequest);
        router.get('/leave/request/print/:leaverequestid', log, loggedIn, getLeaveRequestPrint);
        router.delete('/leave/request/delete', log, loggedIn, deleteLeaveRequests);
        router.put('/leave/request/status/update', log, loggedIn, updateStatusLeaveRequest);

        /* Transfer Requests */
        router.post('/transfer/request/generate', log, loggedIn, createNewTranferRequest);
        router.post('/transfer/request/count', log, loggedIn, countTransferRequests);
        router.get('/transfer/request', log, loggedIn, getTransferRequests);
        router.get('/transfer/request/v2', log, loggedIn, getTransferRequestsV2);
        router.get('/transfer/request/:transferrequestid', log, loggedIn, getSpecificTransferRequest);
        router.get('/transfer/request/print/:transferrequestid', log, loggedIn, getTransferRequestPrint);
        /* router.delete('/transfer/request/delete', log, loggedIn, deleteLeaveRequests); */
        router.put('/transfer/request/status/update', log, loggedIn, updateStatusTransferRequest);
        /* Static Data APIs */
        router.get('/document', log, getAllUserDocuments);
        router.get('/data', log, loggedIn, getStaticJsonData);
        /* Designations */
        router.post('/designation', log, createDesignation);
        router.get('/designation', log, getAllDesignations);
        router.put('/designation', log, updateDesignation);
        router.delete('/designation', log, deleteDesignation);


    }
    getRouter() {
        return this.router;
    }
    getRouteGroup() {
        return '/hr';
    }
}