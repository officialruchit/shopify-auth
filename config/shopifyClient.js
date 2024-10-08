const { shopifyApi, Session, ApiVersion } = require("@shopify/shopify-api");
require("@shopify/shopify-api/adapters/node");
require("dotenv").config();
exports.shopifyRestClient = (store_domain, shopifyAccessToken) => {
  const scope = process.env.SCOPES;
  console.log(scope, ":scope");
  
  const Shopify = shopifyApi({
    apiKey: process.env.SHOPIFY_API_KEY,
    apiSecretKey: process.env.SHOPIFY_API_SECRET,
    scopes: [scope],
    hostName: store_domain.replace(/^https?:\/\//, ""),
    apiVersion: ApiVersion.October24,
  });

  const session = new Session({
    id: Shopify.auth.nonce(),
    shop: store_domain,
    state: Shopify.auth.nonce(),
    isOnline: false,
    accessToken: shopifyAccessToken,
  });
  const client = new Shopify.clients.Rest({ session: session });
  return client;
};
