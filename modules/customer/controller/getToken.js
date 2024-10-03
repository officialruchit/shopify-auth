const jwt = require("jsonwebtoken");
const axios = require("axios");
const pool = require("../../../config/db");

// Generate JWT Token for Store Authentication
const getToken = async (req, res) => {
  const { store_name } = req.query;

  if (!store_name) {
    return res.status(400).json({ message: "Store domain is required" });
  }

  const query = {
    text: "SELECT * FROM shopify_stores WHERE store_name = $1",
    values: [store_name],
  };

  try {
    const result = await pool.query(query);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Store not found" });
    }

    // Generate JWT
    const token = jwt.sign({ store_name }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.status(200).json({ token });
  } catch (error) {
    res.status(500).send("Error generating token.");
  }
};
module.exports = getToken;
