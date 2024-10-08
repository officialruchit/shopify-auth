const pool = require("../../../config/db");
const { shopifyRestClient } = require("../../../config/shopifyClient");

const insertAddress = async (req, res) => {
  const { customer_id, address1, address2, city, country, zip } = req.body;
  const store_domain = req.store_name;

  try {
    const storeQuery = {
      text: "SELECT * FROM shopify_stores WHERE store_name=$1",
      values: [store_domain],
    };

    const storeResult = await pool.query(storeQuery);
    if (storeResult.rowCount === 0) {
      return res.status(404).json({ message: "Store not found." });
    }

    const store = storeResult.rows[0];
    const shopifyAccessToken = store.access_token;
    const client = shopifyRestClient(store_domain, shopifyAccessToken);

    const customerQuery = {
      text: "SELECT * FROM customers WHERE id=$1",
      values: [customer_id],
    };

    const customerResult = await pool.query(customerQuery);
    if (customerResult.rowCount === 0) {
      return res
        .status(404)
        .json({ message: "Customer not found in database." });
    }

    const shopifyCustomerId = customerResult.rows[0].shopify_customer_id;

    // Create new address object
    const address = {
      address1,
      address2: address2 || "",
      city,
      zip,
      country,
    };

    // Add the address to Shopify
    const shopifyResponse = await client.post({
      path: `customers/${shopifyCustomerId}/addresses`,
      data: { address },
    });

    const newShopifyAddress = shopifyResponse.body.customer_address;
    const shopifyAddressId = newShopifyAddress.id;

    // Insert the address into your local PostgreSQL database
    const insertAddressQuery = {
      text: `INSERT INTO addresses (customer_id, shopify_address_id, address1, address2, city, country, zip, created_at, updated_at) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) 
             RETURNING *`,
      values: [
        customer_id,
        shopifyAddressId,
        address1,
        address2,
        city,
        country,
        zip,
      ],
    };

    const addressResult = await pool.query(insertAddressQuery);
    const insertedAddress = addressResult.rows[0];

    // Respond with success and address details
    res.status(201).json({
      message: "Address inserted successfully.",
      shopify_address: newShopifyAddress,
      local_address: insertedAddress,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error inserting address.",
      error: error.response?.data || error.message,
    });
  }
};

module.exports = insertAddress;
