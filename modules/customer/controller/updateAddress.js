const pool = require("../../../config/db");
const { shopifyRestClient } = require("../../../config/shopifyClient");

const updateAddress = async (req, res) => {
  const { customer_id, address_id, address1, address2, city, country, zip } = req.body;
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

    // Create address object for the specific address
    const address = {
      address1,
      address2: address2 || "",
      city,
      zip,
      country,
    };
    
    // Update specific address in Shopify
    const addressResponse = await client.put({
      path: `customers/${shopifyCustomerId}/addresses/${address_id}`, // Use specific address ID
      data: { address },
    });

    const updatedShopifyAddress = addressResponse.body.customer_address;

    // Update the address in your local database as well
    const addressUpdateQuery = {
      text: `UPDATE addresses 
             SET address1 = $1, address2 = $2, city = $3, country = $4, zip = $5, updated_at = CURRENT_TIMESTAMP 
             WHERE customer_id = $6 AND shopify_address_id = $7`, // Make sure the address is specific
      values: [address1, address2, city, country, zip, customer_id, address_id],
    };

    await pool.query(addressUpdateQuery);

    // Respond with success
    res.status(200).json({
      message: "Customer address updated successfully.",
      updated_address: updatedShopifyAddress,
    });
  } catch (error) {
    console.error(
      "Error updating customer address:",
      error.response?.data || error.message
    );
    res.status(500).json({
      message: "Error updating customer address.",
      error: error.response?.data || error.message,
    });
  }
};

module.exports = updateAddress;
