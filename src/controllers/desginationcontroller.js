import { parseBody, generateResponse } from '../utilites';
import Designation from '../models/designation';


export async function createDesignation(req, res){

    let body = parseBody(req);
    try{
        let response = await Designation.addDesgination(body);
        generateResponse(true, "Designation created", response, res);

    }
    catch(e){

        console.log(e);
        generateResponse(false, "Unable to create designation", null, res);
    }
    
}

export async function getAllDesignations(req, res){


    let queryParams = {
        page: req.query.page || 1,
        limit: req.query.limit || 100,
        sort: req.query.sort,
        sortby: req.query.sortby,
    };


    try{
        let desginations = await Designation.getDesignation(queryParams);

        let count = await Designation.countDesgination(queryParams);

        if (count != 0) {
            let data = {
                desginations: desginations,
                current: queryParams.page,
                pages: Math.ceil(count / queryParams.limit),
                totalrecords: count
            }
            generateResponse(true, "Fetch Designations", data, res);
        }
        else {

            let data = {
                desginations: desginations,
                current: queryParams.page,
                pages: queryParams.page,
                totalrecords: count
            }
            generateResponse(true, "Fetch Designations", data, res);
        }

    }
    catch(e){

        console.log(e);
        generateResponse(false, "Unable to fetch designation", null, res);
    }


}


export async function updateDesignation(req, res){

    let updateBody = parseBody(req);
    let id = req.query.id;
    console.log(updateBody);

    try{
        let response = await Designation.updateDesignation({_id : id}, updateBody);
        generateResponse(true, "Designation updated", response, res);

    }
    catch(e){

        console.log(e);
        generateResponse(false, "Unable to update designation", null, res);
    }


}

export async function deleteDesignation(req, res){
    /* let id = decryptValue(req.query.id); */
    let id = req.query.id;

    try{
        let response = await Designation.deleteDesignation(id);
        generateResponse(true, "Designation deleted", response, res);

    }
    catch(e){

        console.log(e);
        generateResponse(false, "Unable to delete designation", null, res);
    }
    
}