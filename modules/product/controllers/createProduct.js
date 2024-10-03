const createProduct = async (req, res) => {
 // const {} = req.body;

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
    console.log(store);
    console.log(shopifyAccessToken);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = createProduct;
