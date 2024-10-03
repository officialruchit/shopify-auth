const axios = require("axios");
const pool = require("../../../config/db");
const bcrypt = require("bcrypt");

const createCustomer = async (req, res) => {
  const {
    first_name,
    last_name,
    email,
    phone,
    password,
    confirmPassword,
    address1,
    address2,
    city,
    country,
    zip,
  } = req.body;
  const store_domain = req.store_name;

  // Email format validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const phoneRegex = /^\+\d{1,4}[0-9]{10}$/;

  // Validate required input fields
  if (
    !first_name ||
    !last_name ||
    !email ||
    !password ||
    password !== confirmPassword
  ) {
    return res.status(400).json({
      message:
        "Invalid input data. 'First name', 'last name', and 'email' ,'password' are required.",
    });
  }

  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: "Invalid email format." });
  }

  if (!phoneRegex.test(phone)) {
    return res.status(400).json({ message: "Invalid phonNumber format." });
  }

  try {
    // Hash the password before storing it
    const hashedPassword = await bcrypt.hash(password, 10);

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
    console.log(store);
    console.log(shopifyAccessToken);

    // Create customer in Shopify
    const shopifyResponse = await axios.post(
      `https://${store_domain}/admin/api/2024-07/customers.json`,
      {
        customer: {
          first_name,
          last_name,
          email,
          phone,
          addresses: [
            {
              address1,
              address2,
              city,
              country,
              zip,
            },
          ],
        },
      },
      {
        headers: {
          "X-Shopify-Access-Token": shopifyAccessToken,
        },
      }
    );

    const shopifyCustomerId = shopifyResponse.data.customer.id;
    const shopifyAddressId = shopifyResponse.data.customer.addresses[0].id;
    console.log(shopifyResponse.data);

    // Save customer in your local PostgreSQL database
    const customerInsertQuery = {
      text: `INSERT INTO customers (shopify_customer_id, store_id, first_name, last_name, email, phone, password) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) 
             RETURNING id`,
      values: [
        shopifyCustomerId,
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

    // Save address in your local database (optional)
    const addressInsertQuery = {
      text: `INSERT INTO addresses (shopify_address_id, customer_id, address1, address2, city, country, zip) 
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      values: [
        shopifyAddressId,
        customerId,
        address1,
        address2,
        city,
        country,
        zip,
      ],
    };

    await pool.query(addressInsertQuery);

    // Respond with success
    res.status(201).json({
      message: "Customer created successfully.",
      customer: {
        shopify_customer_id: shopifyCustomerId,
        first_name,
        last_name,
        email,
        phone,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Error creating customer.",
      error: error.response?.data || error.message,
    });
  }
};

module.exports = createCustomer;
