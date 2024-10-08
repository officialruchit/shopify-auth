const pool = require("../../../config/db");

const getAllProducts = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query; // Default to page 1 and limit to 10
    const offset = (page - 1) * limit;

    // Fetch products along with their options, variants, and images
    const productsQuery = `
      SELECT 
        p.id AS product_id, 
        p.title, 
        p.body_html, 
        p.vendor, 
        p.product_type, 
        p.tags, 
        p.status,
        v.id AS variant_id,
        v.title AS variant_title,
        v.price AS variant_price,
        v.sku AS variant_sku,
        v.inventory_quantity,
        o.id AS option_id,
        o.name AS option_name,
        o.position AS option_position,
        img.id AS image_id,
        img.src AS image_src,
        img.alt AS image_alt,
        img.position AS image_position
      FROM products p
      LEFT JOIN product_variants v ON p.id = v.product_id
      LEFT JOIN product_options o ON p.id = o.product_id
      LEFT JOIN product_images img ON p.id = img.product_id
      ORDER BY p.id
      LIMIT $1 OFFSET $2
    `;

    const productResult = await pool.query(productsQuery, [limit, offset]);

    // Get the total count of products
    const countQuery = "SELECT COUNT(*) AS total FROM products";
    const countResult = await pool.query(countQuery);
    const totalProducts = countResult.rows[0].total;

    // Format the response
    const products = productResult.rows.reduce((acc, row) => {
      const productIndex = acc.findIndex(p => p.product_id === row.product_id);

      if (productIndex === -1) {
        // Product doesn't exist in the accumulator, add it
        acc.push({
          product_id: row.product_id,
          title: row.title,
          body_html: row.body_html,
          vendor: row.vendor,
          product_type: row.product_type,
          tags: row.tags,
          status: row.status,
          variants: row.variant_id ? [{
            variant_id: row.variant_id,
            title: row.variant_title,
            price: row.variant_price,
            sku: row.variant_sku,
            inventory_quantity: row.inventory_quantity
          }] : [],
          options: row.option_id ? [{
            option_id: row.option_id,
            name: row.option_name,
            position: row.option_position
          }] : [],
          images: row.image_id ? [{
            image_id: row.image_id,
            src: row.image_src,
            alt: row.image_alt,
            position: row.image_position
          }] : []
        });
      } else {
        // Product exists, add variants, options, and images
        if (row.variant_id && !acc[productIndex].variants.find(v => v.variant_id === row.variant_id)) {
          acc[productIndex].variants.push({
            variant_id: row.variant_id,
            title: row.variant_title,
            price: row.variant_price,
            sku: row.variant_sku,
            inventory_quantity: row.inventory_quantity
          });
        }
        if (row.option_id && !acc[productIndex].options.find(o => o.option_id === row.option_id)) {
          acc[productIndex].options.push({
            option_id: row.option_id,
            name: row.option_name,
            position: row.option_position
          });
        }
        if (row.image_id && !acc[productIndex].images.find(img => img.image_id === row.image_id)) {
          acc[productIndex].images.push({
            image_id: row.image_id,
            src: row.image_src,
            alt: row.image_alt,
            position: row.image_position
          });
        }
      }

      return acc;
    }, []);

    // Prepare the response
    res.status(200).json({
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalProducts / limit),
      totalProducts: totalProducts,
      products: products
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching products.", error: error.message });
  }
};

module.exports = getAllProducts;
