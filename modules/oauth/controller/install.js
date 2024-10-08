const express = require("express");
require("dotenv").config();
const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY;
const SCOPES = process.env.SCOPES;
const REDIRECT_URI = process.env.REDIRECT_URI;

const install = async (req, res) => {
  const shop = req.query.shop;

  if (shop) {
    try {
      // Build the Shopify OAuth URL
      const shopifyOAuthUrl = `https://${shop}/admin/oauth/authorize?client_id=${SHOPIFY_API_KEY}&scope=${SCOPES}&redirect_uri=${REDIRECT_URI}`;
      // Redirect merchant to Shopify to approve the app
      res.redirect(shopifyOAuthUrl);
    } catch (error) {
      console.error("Error during installation process:", error);
      return res.status(500).send("Error during installation."+error.message);
    }
  } else {
    return res.status(400).send("Missing shop parameter.");
  }
};

module.exports = install;
