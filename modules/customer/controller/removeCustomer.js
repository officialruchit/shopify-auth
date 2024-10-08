const pool = require("../../../config/db");
const { shopifyRestClient } = require("../../../config/shopifyClient");

const removeCustomerFromShopify = async (req, res) => {
  const { customer_id } = req.body;

  const store_domain = req.store_name;

  try {
    // Get the store details from your local DB
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

    // Get the Shopify customer ID from your local DB
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

    // Remove the customer from Shopify
    await client.delete({
      path: `customers/${shopifyCustomerId}`,
    });

    const customerDeleteQuery = {
      text: `DELETE FROM customers 
               WHERE id = $1`,
      values: [customer_id],
    };

    const result = await pool.query(customerDeleteQuery);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Customer not found." });
    }

    res.status(200).json({
      message: "Customer removed from local database successfully.",
    });
  } catch (error) {
    res.status(500).json({
      message: "Error removing customer from Shopify.",
      error: error.response?.data || error.message,
    });
  }
};

module.exports = removeCustomerFromShopify;
