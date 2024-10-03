const express = require('express');
const getToken  = require('../controller/getToken');
const createCustomer=require('../controller/createCustomer')
const authenticateJWT= require('../../../middlware/auth');
const updateCustomer = require('../controller/updateCustomer');
const router = express.Router();

// Route to generate JWT token
router.get('/get-token', getToken);
router.post('/create-customer', authenticateJWT, createCustomer);
router.put('/customer/update',authenticateJWT, updateCustomer);
// Route to create customer (protected by JWT authentication)
//router.post('/create-customer', authenticateJWT, createCustomer);

module.exports = router;
