const express = require('express');
const router = express.Router();

const authenticateJWT= require('../../../middlware/auth');
const createProduct = require('../controllers/createProduct');
const updateProduct = require('../controllers/updateProduct');

router.post('/create-product', authenticateJWT, createProduct);
router.put('/product/update',authenticateJWT, updateProduct);

module.exports = router;
