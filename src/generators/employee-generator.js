import faker from 'faker';
import { getDates } from '../utilites/index';
import config from "../conf";
import { hashSync, genSaltSync } from "bcrypt";
import { EMPLOYEE_TYPE, EMPLOYEE_STATUS, ATTENDANCE_TYPES, LEAVE_TYPES } from '../utilites/constants';


export function generateEmployee(employee_number) {

    let plainPass = employee_number;

    let passSalt = genSaltSync(parseInt(config.app['password_saltRounds'], 10));
    let hash = hashSync(plainPass.toString(), passSalt);
    /* Unit */
    let generateForUnit = '5c7f8008571b7661476922d3';
    /* Department */
    let generateForDept = '5c7f810b01093262fe372692';
    /* employee */
    let generateForRole = '5bf7e3dceca3ae4df4159dcd';

    let employee = {

        basic_details: {

            firstname: faker.name.firstName(),
            lastname: faker.name.lastName(),
            cnic: `${faker.random.number(100000)}-${faker.random.number(10000000)}-${faker.random.number(1)}`,
            email: faker.internet.email(),
            dob: faker.date.past(),
            contact_one: 12345678901,
            contact_two: '',
            nationality: 'Pakistani',
            blood_group: 'B-Positive',
            gender: 'M',
            profile_image: '',
            role: generateForRole
        },
        family_details: {
            martial_status: false,
            spouses: [],
            children: [],
            family_members: []
        },
        employment_details: {
            employee_type: EMPLOYEE_TYPE[0],
            password: hash,
            employee_number: employee_number,
            department: generateForDept,
            unit: generateForUnit,
            confirmation_date: '',
            joining_date: '',
            prefix: '',
            contract_period: '',
            designation: '',
            grade: '',
            salary: '',
            payment_type: '',
            account_details: {
                bank_name: '',
                acc_number: '',
                branch: ''
            }
        },
        location_details: {
            address: '',
            city: '',
            country: ''
        },
        leave_details: [{
            name: LEAVE_TYPES[0],
            total: 10,
        },
        {
            name: LEAVE_TYPES[1],
            total: 10,
        },
        {
            name: LEAVE_TYPES[2],
            total: 10,
        }
        ],
        status: {
            'is_activated': EMPLOYEE_STATUS[1]
        },
        attendance_details: [
        {

            month: '0',
            year : '2019',
            total_extra_hours: '0:0',
            total_service_hours: '0:0',
            leaves_history: [],
            attendances : []

        },
        {

            month: '1',
            year : '2019',
            total_extra_hours: '0:0',
            total_service_hours: '0:0',
            leaves_history: [],
            attendances : []

        }]
    };
    let startDateJan =  new Date(2019,0,2);
    let endDateJan = new Date(2019,1,1);

    let startDateFeb =  new Date(2019,1,2);
    let endDateFeb = new Date(2019,2,1);


  
    let attendance_jan_19 = [];
    let attendance_feb_19 = [];


    
   
    let janDates = getDates(startDateJan, endDateJan);
    let febDates = getDates(startDateFeb, endDateFeb);
    
    for (let i = 0; i < janDates.length; i++) {
            
        const tempObj = {
            attendance_type : ATTENDANCE_TYPES[0],
            attendance_date :  `2019-1-${i+1}`,
            time_in: {
                hour: '00',
                min: '00'
            },
            time_out: {
                hour: '00',
                min: '00'
            },
            service_hours: '00:00',
            extra_hours: '0:0'

        }
        attendance_jan_19.push(tempObj);
        
    }

    for (let i = 0; i < febDates.length; i++) {
            
        const tempObj = {
            attendance_type : ATTENDANCE_TYPES[0],
            attendance_date : `2019-2-${i+1}`,
            time_in: {
                hour: '00',
                min: '00'
            },
            time_out: {
                hour: '00',
                min: '00'
            },
            service_hours: '00:00',
            extra_hours: '0:0'

        }
        attendance_feb_19.push(tempObj);
        
    }


    
    employee['attendance_details'][0]['attendances'] = attendance_jan_19;
    employee['attendance_details'][1]['attendances'] = attendance_feb_19;


    return employee;



}