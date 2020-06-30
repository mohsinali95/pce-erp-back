 /*  { $unwind: "$attendance_details.attendances.attendance_date" },
             { $addFields: {
                 "attendancedate": {
                 "$dateFromString": { dateString: "$attendance_date" }
                 } 
             }
             }, */
           /*  {
                $addFields: {
                    "attendance_date": new Date('$attendance_details.attendances.attendance_date')
                }
            }, */


            /* { $project: { "attendance_details.attendances.attendance_date": 1, "attendance_details.attendances.attendance_type" : 1} }, */
            /* {$sort : {"attendance_details.attendances.attendance_date" : 1}} */


             /*  {
                $group:
                    { _id: "$_id.employee_number" }, "data": { $push: { attendance_type: "$_id.attendance_type", attendance_count: "$count" } }
            }, */



            


            const pipeline = [

            { $unwind: "$attendance_details" },
            { $unwind: "$attendance_details.attendances" },
            {
                $match: {
                    'employee_number': { $in: employees },
                    'attendance_details.attendances.attendance_date': { $in: attendanceDateStringArray }
                }
            },
            {
                $group: { _id: { attendance_type: "$attendance_details.attendances.attendance_type", employee_number: "$employee_number" }, count: { $sum: 1 } }
            },
            {
                $project: { _id: 0, attendance_type: "$_id.attendance_type", employee_number: "$_id.employee_number", /* "attendance_details.attendances.time_in" : 1 , "attendance_details.attendances.time_out" : 1 , */ count: 1 }
            },
            {
                $group: { _id: "$employee_number", "attendance_types": { $push: { attendance_type: "$attendance_type", attendance_count: "$count" } }, "total_days": { "$sum": "$count" } }
            },
            {
                $project: { _id: 0, employee_number: "$_id", attendance_types: 1, total_days: 1 }
            }
        ];



        /* Installments Login */

        payrollmonth = parseInt(payrollmonth) + 1;
    console.log(payrollmonth)

    let loanAmount = 0;

    let searchParam = {

        "employee" : employee_id,
        "loan_status" : LOAN_STATUS['active'],
        /* "installments.month" : payrollmonth,
        "installments.year" : payrollyear */

    };

    
    let documents =  await EmployeeLoan.getSpecificEmployeeLoan(searchParam, '')

    /* console.log('Imp', documents) */
    let installments = documents[1]['installments'];
    /* console.log(installments); */

    let currentInstallment = installments.filter(ele=>{

        return ele['month'] == payrollmonth && ele['year'] == payrollyear

    });

    if(currentInstallment.length === 0){

        let lastInstallment = installments.length-1

        let lastInstallmentDate = new Date(installments[lastInstallment]['year'], installments[lastInstallment]['month']);
        let currentDate = new Date(payrollyear, payrollmonth)

        console.log(currentDate, lastInstallmentDate);

        if(currentDate > lastInstallmentDate){

            loanAmount = documents[1]['loan_amount']['total'] - documents[1]['loan_amount']['paid']            
            console.log(loanAmount);
        }

        /* console.log('No Installment Found'); */

    }
    else{

        loanAmount = currentInstallment[0]['amount'];


    }

    return loanAmount;


    /*  let loanTotalAmount = loanData.reduce((acc, ele)=>{

        return ele['amount'] + acc
    }, 0)

    console.log(loanTotalAmount); */


     /* Employees Loan */
        /*  let loansList = employees.map(async (obj)=>{
 
             console.log(obj);
 
             let testLoan = await getEmployeeLoanAmount(obj, payroll_month, payroll_year)
             return testLoan;
         }); */