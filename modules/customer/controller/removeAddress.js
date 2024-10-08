const pool = require("../../../config/db");
const { shopifyRestClient } = require("../../../config/shopifyClient");

const deleteAddress = async (req, res) => {
  const { customer_id, address_id } = req.body;
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
      return res.status(404).json({ message: "Customer not found in database." });
    }

    const shopifyCustomerId = customerResult.rows[0].shopify_customer_id;

    // Delete the specific address from Shopify
    await client.delete({
      path: `customers/${shopifyCustomerId}/addresses/${address_id}`, // Use specific address ID
    });

    // Delete the specific address in your local database
    const addressDeleteQuery = {
      text: `DELETE FROM addresses WHERE customer_id = $1 AND shopify_address_id = $2`, // Specific to the customer and address ID
      values: [customer_id, address_id],
    };

    await pool.query(addressDeleteQuery);

    // Respond with success
    res.status(200).json({
      message: "Customer address deleted successfully.",
    });
  } catch (error) {
    console.error(
      "Error deleting customer address:",
      error.response?.data || error.message
    );
    res.status(500).json({
      message: "Error deleting customer address.",
      error: error.response?.data || error.message,
    });
  }
};

module.exports = deleteAddress;
