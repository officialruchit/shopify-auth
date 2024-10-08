const express = require("express");
const install = require('../controller/install');
const shopifyCallback = require('../controller/shopifyCallback');

const router = express.Router();

// Route for app installation
router.get('/shopify', install);

// Route for Shopify OAuth callback
router.get('/shopify/callback', shopifyCallback);

module.exports = router;
