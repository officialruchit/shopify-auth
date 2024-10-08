const { shopifyRestClient } = require("../../../config/shopifyClient");
const pool = require("../../../config/db");
const generateVariants = require('../../../utils/generateVariants')

const updateProduct = async (req, res) => {
  const { productId } = req.params; // Get product ID from the URL parameters

  const store_domain = req.store_name; // Get store domain from the request
  const {
    title,
    body_html,
    vendor,
    product_type,
    price,
    inventory_quantity,
    tags,
    images,
    status,
    options,
  } = req.body;

  // Validation: Check required fields
  if (!title || !options || options.length === 0) {
    return res.status(400).json({
      message: "Product title and at least one option are required.",
    });
  }

  try {
    // Fetch the store information from your PostgreSQL DB
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
    const client = shopifyRestClient(store_domain, shopifyAccessToken);

    const generatedVariants = generateVariants(options);
    // Fetch the existing product's Shopify ID from your PostgreSQL DB
    const productQuery = {
      text: "SELECT shopify_product_id FROM products WHERE id = $1",
      values: [productId],
    };

    const productResult = await pool.query(productQuery);
    
    if (productResult.rowCount === 0) {
      return res.status(404).json({ message: "Product not found in database." });
    }
    const uniqueTags = [...new Set(tags.split(","))].join(" ");
    const shopifyProductId = productResult.rows[0].shopify_product_id; // Get the Shopify Product ID

    // Create the payload for Shopify with updated data
    const shopifyProductPayload = {
      product: {
        title,
        body_html: body_html || null,
        vendor: vendor || null,
        product_type: product_type || null,
        tags: uniqueTags || "",
        variants: generatedVariants.map((variant, index) => ({
          title: `Variant ${index + 1}`,
          price: price, // You can set default pricing logic here
          sku: `SKU_${index + 1}`, // SKU generation logic
          inventory_quantity:inventory_quantity,
          option1: variant[0],
          option2: variant[1],
          option3: variant[2],
        })),
        images: images.map((image) => ({
          src: image.src,
          alt: image.alt,
        })),
        options: options.map((option) => ({
          name: option.name,
          position: option.position,
        })),
      },
    };

    // Update product in Shopify
    const shopifyProductResponse = await client.put({
      path: `products/${shopifyProductId}`,
      data: shopifyProductPayload,
    });

    // Check if the update was successful
    if (!shopifyProductResponse.body?.product) {
      throw new Error("Shopify product update failed. No product data returned.");
    }

    // Update product in your PostgreSQL DB
    const productUpdateQuery = {
      text: `
        UPDATE products 
        SET title = $1, body_html = $2, vendor = $3, product_type = $4, tags = $5, status = $6
        WHERE id = $7
      `,
      values: [
        title,
        body_html || null,
        vendor || null,
        product_type || null,
        tags ? tags.split(",").map(tag => tag.trim()).join(" ") : null,
        status,
        productId,
      ],
    };

    await pool.query(productUpdateQuery);

    // Update or insert variants into the database
    await pool.query("DELETE FROM product_variants WHERE product_id = $1", [productId]); // Clear old variants

    for (const variant of shopifyProductResponse.body.product.variants) {
      const variantInsertQuery = {
        text: `
          INSERT INTO product_variants 
          (shopify_variant_id, product_id, title, price, sku, inventory_quantity, option1, option2, option3)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `,
        values: [
          variant.id, // Assuming you have Shopify variant ID here
          productId,
          variant.title || null,
          variant.price,
          variant.sku || null,
          variant.inventory_quantity,
          variant.option1 || null,
          variant.option2 || null,
          variant.option3 || null,
        ],
      };
      await pool.query(variantInsertQuery);
    }

    // Update or insert images into the database
    await pool.query("DELETE FROM product_images WHERE product_id = $1", [productId]); // Clear old images
    for (const image of shopifyProductResponse.body.product.images) {
      const imageInsertQuery = {
        text: `
          INSERT INTO product_images (shopify_image_id, product_id, src, alt, position)
          VALUES ($1, $2, $3, $4, $5)
        `,
        values: [
          image.id, // Assuming you have Shopify image ID here
          productId,
          image.src,
          image.alt || null,
          image.position,
        ],
      };
      await pool.query(imageInsertQuery);
    }

    // Update or insert options into the database
    await pool.query("DELETE FROM product_options WHERE product_id = $1", [productId]); // Clear old options

    for (const option of shopifyProductResponse.body.product.options) {
      const optionInsertQuery = {
        text: `
          INSERT INTO product_options (shopify_option_id, product_id, name, position)
          VALUES ($1, $2, $3, $4)
        `,
        values: [option.id, productId, option.name, option.position],
      };
      await pool.query(optionInsertQuery);
    }

    // Return success response
    res.status(200).json({
      message: "Product updated successfully!",
      product: {
        id: productId,
        title,
        body_html,
        vendor,
        product_type,
        tags,
        status,
      },
    });
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ message: "Error updating product.", error: error.message });
  }
};
module.exports = updateProduct;
