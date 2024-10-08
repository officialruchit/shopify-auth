const { shopifyRestClient } = require("../../../config/shopifyClient");
const pool = require("../../../config/db");

const updateCustomer = async (req, res) => {
  const {
    customer_id,
    first_name,
    last_name,
    email,
    phone,
    password,
    confirmPassword,
  } = req.body;

  const store_domain = req.store_name;

  // Validate the input data
  if (!customer_id || !first_name || !last_name || !email) {
    return res.status(400).json({
      message: "'Customer ID', 'First name', 'Last name', and 'Email' are required.",
    });
  }

  if (password && password !== confirmPassword) {
    return res.status(400).json({
      message: "Passwords do not match.",
    });
  }

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

    // Create customer object
    const customer = {
      first_name,
      last_name,
      email,
      phone,
      ...(password && { password, password_confirmation: password }),
    };

    // Update customer on Shopify
    const customerResponse = await client.put({
      path: `customers/${shopifyCustomerId}`,
      data: { customer },
    });

    console.log("Shopify customer updated:", customerResponse);

    // Update customer in your local PostgreSQL database
    const customerUpdateQuery = {
      text: `
        UPDATE customers 
        SET first_name = $1, last_name = $2, email = $3, phone = $4, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $5
      `,
      values: [first_name, last_name, email, phone, customer_id],
    };

    await pool.query(customerUpdateQuery);

    // Respond with success
    res.status(200).json({
      message: "Customer updated successfully.",
      customer: {
        shopify_customer_id: shopifyCustomerId,
        first_name,
        last_name,
        email,
        phone,
      },
    });
  } catch (error) {
    console.error("Error updating customer:", error.response?.data || error.message);
    res.status(500).json({
      message: "Error updating customer.",
      error: error.response?.data || error.message,
    });
  }
};

module.exports = updateCustomer;
