const express = require("express");
const getToken = require("../controller/getToken");
const createCustomer = require("../controller/createCustomer");
const authenticateJWT = require("../../../middlware/auth");
const updateCustomer = require("../controller/updateCustomer");
const updateAddress = require("../controller/updateAddress");
const removeAddressFromShopify = require("../controller/removeAddress");
const removeCustomerFromShopify = require("../controller/removeCustomer");
const insertAddress = require("../controller/createAddress");
const getAllCustomers = require("../controller/getAllCustomers");
const getAllAddresses = require("../controller/getAllAddress");
const router = express.Router();

router.get("/get-token", getToken);
router.get("/customers", getAllCustomers);
router.get("/addresses", getAllAddresses);
router.post("/create/customer", authenticateJWT, createCustomer);
router.post("/create/address", authenticateJWT, insertAddress);
router.put("/customer/update", authenticateJWT, updateCustomer);
router.put("/address/update", authenticateJWT, updateAddress);
router.delete("/address/remove", authenticateJWT, removeAddressFromShopify);
router.delete("/customer/remove", authenticateJWT, removeCustomerFromShopify);

module.exports = router;
