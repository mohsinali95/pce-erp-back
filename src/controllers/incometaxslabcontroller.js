'use strict';

import { parseBody, generateResponse } from '../utilites';
import IncometaxSlab from '../models/incometax_slab';
import _ from 'lodash';

export async function createTaxSlab(req, res) {


    try {
        let body = parseBody(req);
        let creation = await IncometaxSlab.addTaxSlab(body);
        generateResponse(true, "slab created successfully", creation, res);
    }
    catch (e) {

        console.log(e);
        generateResponse(false, "unable to create slab", null, res);
    }

}

export async function getTaxSlab(req, res) {

    let queryParams = {
        page: req.query.page || 1,
        limit: req.query.limit || 100,
        sort: req.query.sort,
        sortby: req.query.sortby,
    };


    try {
        let slabs = await IncometaxSlab.getTaxSlabs(queryParams);

        let count = await IncometaxSlab.countSlabs(queryParams);

        if (count != 0) {
            let data = {
                slabs: slabs,
                current: queryParams.page,
                pages: Math.ceil(count / queryParams.limit),
                totalrecords: count
            }
            generateResponse(true, "slabs fetched successfully", data, res);
        }
        else {

            let data = {
                slabs: slabs,
                current: queryParams.page,
                pages: queryParams.page,
                totalrecords: count
            }
            generateResponse(true, "slabs fetched successfully", data, res);
        }

    }
    catch (e) {

        console.log(e);
        generateResponse(false, "unable to fetch slabs", null, res);
    }
}

export async function getSpecificTaxSlab(req, res) {
    try {
        let id = req.params.slabid;
        let result = await IncometaxSlab.getSpecificTaxSlab({ _id: id })
        generateResponse(false, "specific slab fetched successfully", result, res);
    }
    catch (e) {

        console.log(e);
        generateResponse(false, "unable to fetch slab", null, res);
    }
}

export async function updateTaxSlab(req, res) {

    let body = parseBody(req);
    let id = req.params.slabid;
    console.log(body);

    try {
        let response = await IncometaxSlab.updateTaxSlab({ _id: id }, body);
        generateResponse(true, "slab updated", response, res);

    }
    catch (e) {

        console.log(e);
        generateResponse(false, "unable to update slab", null, res);
    }
}
export async function deleteTaxSlab(req, res) {

    let id = req.query.id

    try {
        let response = await IncometaxSlab.deleteTaxSlab(id);
        generateResponse(true, "slab deleted", response, res);
    }
    catch (e) {

        console.log(e);
        generateResponse(false, "unable to delete slab", null, res);
    }
}