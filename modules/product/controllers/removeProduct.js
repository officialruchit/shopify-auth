const { shopifyRestClient } = require("../../../config/shopifyClient");
const pool = require("../../../config/db");

const removeProduct = async (req, res) => {
  const { shopify_product_id } = req.params;
  const store_domain = req.store_name;
console.log(shopify_product_id)
  // Validation: Check if shopify_product_id is provided
  if (!shopify_product_id) {
    return res.status(400).json({
      message: "Shopify product ID is required.",
    });
  }

  try {
    // Fetch the store from your PostgreSQL DB
    const storeQuery = {
      text: "SELECT * FROM shopify_stores WHERE store_name=$1",
      values: [store_domain],
    };

    const storeResult = await pool.query(storeQuery);

    // Check if store exists in DB
    if (storeResult.rowCount === 0) {
      return res.status(404).json({ message: "Store not found." });
    }

    const store = storeResult.rows[0];
    const shopifyAccessToken = store.access_token;

    // Initialize Shopify client
    const client = shopifyRestClient(store_domain, shopifyAccessToken);

    // Remove product from Shopify
    await client.delete({
      path: `products/${shopify_product_id}`,
    });

    // Remove product from your PostgreSQL DB
    const deleteProductQuery = {
      text: "DELETE FROM products WHERE shopify_product_id = $1 RETURNING *",
      values: [shopify_product_id],
    };

    const deleteProductResult = await pool.query(deleteProductQuery);

    if (deleteProductResult.rowCount === 0) {
      return res.status(404).json({
        message: "Product not found in the database.",
      });
    }

    // Return success response
    res.status(200).json({
      message: "Product successfully removed from Shopify and database.",
      product: deleteProductResult.rows[0], // Return deleted product details
    });

  } catch (error) {
    console.error("Error removing product:", error);
    res.status(500).json({ message: "Error removing product.", error: error.message });
  }
};

module.exports = removeProduct;
