const pool = require("../../../config/db");
const bcrypt = require("bcrypt");
const { shopifyRestClient } = require("../../../config/shopifyClient");

const createCustomer = async (req, res) => {
  // Destructure the request body
  const { first_name, last_name, email, phone, password, confirmPassword } =
    req.body;
  const store_domain = req.store_name;

  // Validate input fields
  if (
    !first_name ||
    !last_name ||
    !email ||
    !password ||
    password !== confirmPassword
  ) {
    return res.status(400).json({
      message:
        "Invalid input data. 'First name', 'last name', 'email', and 'password' are required.",
    });
  }

  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Fetch store details from local DB
    const storeResult = await pool.query({
      text: "SELECT * FROM shopify_stores WHERE store_name=$1",
      values: [store_domain],
    });

    if (storeResult.rowCount === 0) {
      return res.status(404).json({ message: "Store not found." });
    }

    const store = storeResult.rows[0];
    const shopifyAccessToken = store.access_token;

    // Initialize Shopify client
    const client = shopifyRestClient(store_domain, shopifyAccessToken);

    // Create customer object
    const customer = {
      first_name,
      last_name,
      email,
      phone,
      password,
      password_confirmation: password,
    };

    // Save the customer to Shopify
    const customerResponse = await client.post({
      path: "customers",
      data: { customer },
    });
    // Insert customer into your PostgreSQL database
    const customerInsertQuery = {
      text: `INSERT INTO customers (shopify_customer_id, store_id, first_name, last_name, email, phone, password) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) 
             RETURNING id`,
      values: [
        customerResponse.body.customer.id, // Correctly use the customer ID returned by Shopify
        store.id,
        first_name,
        last_name,
        email,
        phone,
        hashedPassword,
      ],
    };

    const customerResult = await pool.query(customerInsertQuery);
    const customerId = customerResult.rows[0].id;

    // Respond with success
    res.status(201).json({
      message: "Customer created successfully.",
      customer: {
        shopify_customer_id: customerResponse.body.customer.id,
        first_name,
        last_name,
        email,
        phone,
      },
    });
  } catch (error) {
    console.error("Error creating customer:", error);
    res.status(500).json({
      message: "Error creating customer.",
      error: error.response?.data || error.message,
    });
  }
};

module.exports = createCustomer;
