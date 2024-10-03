const crypto = require("crypto");
const axios = require("axios");
const pool = require("../../../config/db");
require("dotenv").config();
const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY;
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET;

// Shopify OAuth callback
const shopifyCallback = async (req, res) => {
  const { shop, hmac, code } = req.query;

  if (!shop || !hmac || !code) {
    return res.status(400).send("Missing required parameters.");
  }

  // Verify the HMAC signature
  const queryString = Object.keys(req.query)
    .filter((key) => key !== "hmac")
    .map((key) => `${key}=${req.query[key]}`)
    .join("&");

  const hash = crypto
    .createHmac("sha256", SHOPIFY_API_SECRET)
    .update(queryString)
    .digest("hex");

  if (hash !== hmac) {
    return res.status(400).send("HMAC validation failed.");
  }

  // Exchange the authorization code for a permanent access token
  const accessTokenRequestUrl = `https://${shop}/admin/oauth/access_token`;
  const accessTokenPayload = {
    client_id: SHOPIFY_API_KEY,
    client_secret: SHOPIFY_API_SECRET,
    code,
  };

  try {
    // Request the access token
    const response = await axios.post(
      accessTokenRequestUrl,
      accessTokenPayload
    );
    const accessToken = response.data.access_token;

    // Fetch shop details
    const shopResponse = await axios.get(
      `https://${shop}/admin/api/2023-07/shop.json`,
      {
        headers: {
          "X-Shopify-Access-Token": accessToken,
        },
      }
    );

    const shopData = shopResponse.data.shop;
    console.log(shopData)
    const storeName = shopData.domain;
  console.log(storeName)
    const email = shopData.email;
    const ownerName = shopData.shop_owner;

    // Insert the shop details into the database
    const query = {
      text: `INSERT INTO shopify_stores 
            (store_name, user_name, email, access_token, created_at, updated_at) 
            VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) 
            RETURNING id`,
      values: [storeName, ownerName, email, accessToken],
    };

    const result = await pool.query(query);

    res.status(200).send("App installed and merchant info saved successfully.");
  } catch (error) {
    res.status(500).send("Error during token exchange or fetching shop data.");
  }
};
module.exports = shopifyCallback;
