'use strict';

import {Request, Response} from 'express';

export function DefaultController(req, res) {

    res.send('Home Handler');
}
