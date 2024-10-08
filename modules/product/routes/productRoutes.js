const express = require('express');
const router = express.Router();

const authenticateJWT= require('../../../middlware/auth');
const createProduct = require('../controllers/createProduct');
const updateProduct = require('../controllers/updateProduct');
const getAllProducts = require('../controllers/getProduct');
const removeProduct = require('../controllers/removeProduct');

router.get('/getAllProducts',authenticateJWT,getAllProducts);
router.post('/create-product', authenticateJWT, createProduct);
router.put('/update-product/:productId',authenticateJWT, updateProduct);
router.delete('/deleteProduct/:shopify_product_id',authenticateJWT,removeProduct)

module.exports = router;
            