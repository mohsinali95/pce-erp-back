export function searchQuery(Model, callback, limit, page, sort = {}, find_params = {}, populates = [], select_fields = '') {

    let model = Model.find(find_params, callback)
        .select(select_fields)
        .lean(true)
        .sort(sort)
    for (let i = 0; i < populates.length; i++) {
        model = model.populate(populates[i])
    }
    model = model.skip(parseInt((limit * page) - limit))
        .limit(parseInt(limit))
}

export function searchQueryV2(Model, limit, page, sort = {}, find_params = {}, populates = [], select_fields = '') {

    
    let model = Model.find(find_params)
        .select(select_fields)
        .lean(true)
        .sort(sort)
    for (let i = 0; i < populates.length; i++) {
        model = model.populate(populates[i])
    }


    if(typeof limit !== 'undefined' && typeof page !== 'undefined'){
        model = model.skip(parseInt((limit * page) - limit))
        .limit(parseInt(limit))

    }
    return model;

}
export function getCountOfRecords(Model, callback, params = {}) {

    Model.countDocuments(params, callback);
}
export function getCountOfRecordsV2(Model, params = {}) {

    return Model.countDocuments(params);
}