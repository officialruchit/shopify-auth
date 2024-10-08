const pool = require("../../../config/db");

const getAllAddresses = async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const offset = (page - 1) * limit;

  try {
    // Query to get the total count of customers
    const totalCountQuery = "SELECT COUNT(*) FROM addresses";
    const totalCountResult = await pool.query(totalCountQuery);
    const totalCount = parseInt(totalCountResult.rows[0].count, 10);

    // Query to get paginated customers
    const customersQuery = {
      text: `SELECT * FROM addresses ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      values: [limit, offset],
    };

    const addressesResult = await pool.query(customersQuery);
    const addresses = addressesResult.rows;

    // Calculate total pages
    const totalPages = Math.ceil(totalCount / limit);

    // Respond with paginated customer data and pagination info
    res.status(200).json({
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalCustomers: totalCount,
      totalPages,
      addresses,
    });
  } catch (error) {
    console.error("Error fetching customers:", error.message);
    res.status(500).json({
      message: "Error fetching customers.",
      error: error.message,
    });
  }
};

module.exports = getAllAddresses;
