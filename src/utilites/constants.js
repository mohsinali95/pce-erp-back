export const GENDER_TYPE = ['M', 'F', 'U'];
export const EMPLOYEE_STATUS = ['Pending', 'Activated', 'Deactivated'];
export const LEAVE_TYPES = ['Medical', 'Casual', 'Annual'/* , 'Grace' */];
export const LOAN_TYPES = ['Death', 'Accident', 'Natural Disaster']
export const EMPLOYEE_TYPE = ['Permanent', 'Probation', 'Trainee', 'Contract', 'Job Candidate'];
export const REPORT_TYPES = ['excel', 'csv'];

export const PAYROLE_START_DATE = 25;

export const REQUEST_STATUS = {

    'pending': 0,
    'approved': 1,
    'hired_close': 2,
    'rejected': 3,
    'closed': 4
};
export const LEAVE_REQUEST_STATUS = {

    'pending': 0,
    'approved': 1,
    'rejected': 2,
    'rejected_by_user': 3
};

export const TRANSFER_REQUEST_STATUS = {

    'pending': 0,
    'approved': 1,
    'rejected': 2,
    'reversed': 3

};

export const ATTENDANCE_CHANGE_REQUEST = {

    'pending': 0,
    'approved': 1,
    'rejected': 2,

};
export const LOAN_REQUEST_STATUS = {

    'pending': 0,
    'approved': 1,
    'rejected': 2,
};

export const ADV_REQUEST_STATUS = {

    'pending': 0,
    'approved': 1,
    'rejected': 2,
};

export const FINE_REQUEST_STATUS = {

    'pending': 0,
    'approved': 1,
    'rejected': 2,
};


export const ADVANCE_STATUS = {

    'open': 1,
    'closed': 2

};

export const FINE_STATUS = {

    'pending' : 0,
    'waved' : 1,
    'paid' : 2


};


export const LOAN_STATUS = {

    'active': 0,
    'cleared': 1
};
export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const ATTENDANCE_TYPES = ['Present', 'Late', 'Holiday', 'Leave', 'Absent'];

export const TRANSFER_TYPES = ['TEMPORARY', 'PERMANENT', 'INITIAL'];

export const SYSTEM_ROLES = ['admin'];

export const SYSTEM_EMPLOYEES = ['000'];

export const REQUEST_TYPE = ['Hiring Process', 'Leave', 'Transfer', 'Loan', 'Advance', 'Fine'];
export const ASSET_STATUS = ['Lost', 'Received', 'Returned'];


export const TIME_STAMPES = {
    updated_at: {
        type: Date,
        default: Date.now
    },
    created_at: {
        type: Date,
        default: Date.now
    }
};
export const FLAGS = {

    is_deleted: {
        type: Boolean,
        default: false
    },
    is_activated: {
        type: Boolean,
        default: true
    }

};