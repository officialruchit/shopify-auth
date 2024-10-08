const pool = require("../../../config/db");
const getAllCustomers = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query; // Default to page 1, 10 results per page

    const offset = (page - 1) * limit;

    // Fetch customers with their addresses using pagination
    const customerQuery = `
      SELECT 
        customers.id AS customer_id, 
        customers.first_name, 
        customers.last_name, 
        customers.email, 
        customers.phone,
        addresses.address1, 
        addresses.address2, 
        addresses.city, 
        addresses.country, 
        addresses.zip
      FROM customers
      LEFT JOIN addresses ON customers.id = addresses.customer_id
      LIMIT $1 OFFSET $2
    `;

    const customerResult = await pool.query(customerQuery, [limit, offset]);

    // Get the total number of customers
    const countQuery = "SELECT COUNT(*) AS total FROM customers";
    const countResult = await pool.query(countQuery);
    const totalCustomers = countResult.rows[0].total;

    // Calculate total pages
    const totalPages = Math.ceil(totalCustomers / limit);

    res.status(200).json({
      currentPage: parseInt(page),
      totalPages: totalPages,
      totalCustomers: parseInt(totalCustomers),
      customers: customerResult.rows,
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching customers.", error: error.message });
  }
};

module.exports = getAllCustomers;
