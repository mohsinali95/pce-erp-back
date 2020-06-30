import faker from 'faker';

export function generateUnit(code){

    const unit = {

        name : 'B - ' + faker.company.companyName(),
        code : code,
        address : faker.address.streetAddress(),
        email : faker.internet.email(),
        phone_number : faker.phone.phoneNumberFormat(),
        unit_type : 3,
        configuration : {
            week_start : /* faker.date.weekday() */ 'Monday',
            holidays : ['Saturday', 'Sunday'],
            working_hours : {

                from : {
                    hour : '09',
                    min : '00' 
                },
                to : {
                    hour : '18',
                    min : '00' 
                }
            }
        },
        parent_unit: '5c7f8090418517623d861802',
        ancestors : ['5c7f8008571b7661476922d3', '5c7f805b98607961d21d4634', '5c7f8090418517623d861802']
    };

    return unit;



}