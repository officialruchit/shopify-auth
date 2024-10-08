const { shopifyRestClient } = require("../../../config/shopifyClient");
const pool = require("../../../config/db");

const createProduct = async (req, res) => {
  const {
    title,
    body_html,
    vendor,
    product_type,
    tags,
    images,
    status,
    options,
  } = req.body;
  console.log(req.body)
  const store_domain = req.store_name;

  // Validation: Check required fields
  if (!title || !options || options.length === 0) {
    return res.status(400).json({
      message: "Product title and at least one option are required.",
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

    const uniqueTags = [...new Set(tags.split(","))].join(" ");

    const client = shopifyRestClient(store_domain, shopifyAccessToken);

    // Generate all possible variant combinations
    const generatedVariants = generateVariants(options);

    const shopifyProductPayload = {
      product: {
        title,
        body_html: body_html || null,
        vendor: vendor || null,
        product_type: product_type || null,
        tags: uniqueTags || "",
        variants: generatedVariants.map((variant, index) => ({
          title: `Variant ${index + 1}`,
          price: "0.00", // You can set default pricing logic here
          sku: `SKU_${index + 1}`, // SKU generation logic
          inventory_quantity: 0,
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

    // Create product in Shopify
    const shopifyProductResponse = await client.post({
      path: "products",
      data: shopifyProductPayload,
    });
    const shopifyProduct = shopifyProductResponse.body?.product;
    if (!shopifyProduct) {
      throw new Error(
        "Shopify product creation failed. No product data returned."
      );
    }

    const shopifyProductId = shopifyProduct.id;

    // Insert product into your PostgreSQL DB
    const productInsertQuery = {
      text: `
        INSERT INTO products 
        (shopify_product_id, store_id, title, body_html, vendor, product_type, tags, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `,
      values: [
        shopifyProductId,
        store.id,
        title,
        body_html || null,
        shopifyProduct.vendor || null,
        product_type || null,
        uniqueTags || null,
        status,
      ],
    };

    const productResult = await pool.query(productInsertQuery);
    const productId = productResult.rows[0].id;

    // Insert variants into the database
    for (const variant of shopifyProduct.variants) {
      const variantInsertQuery = {
        text: `
          INSERT INTO product_variants 
          (shopify_variant_id, product_id, title, price, sku, inventory_quantity, option1, option2, option3)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `,
        values: [
          variant.id,
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

    // Insert images into the database
    for (const image of shopifyProduct.images) {
      const imageInsertQuery = {
        text: `
          INSERT INTO product_images (shopify_image_id, product_id, src, alt, position)
          VALUES ($1, $2, $3, $4, $5)
        `,
        values: [
          image.id,
          productId,
          image.src,
          image.alt || null,
          image.position,
        ],
      };
      await pool.query(imageInsertQuery);
    }

    // Insert options into the database
    for (const option of shopifyProduct.options) {
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
    res.status(201).json({
      message: "Product created successfully!",
      product: {
        id: productId,
        shopify_product_id: shopifyProductId,
        title,
        body_html,
        vendor,
        product_type,
        tags: uniqueTags,
        status,
      },
    });
  } catch (error) {
    console.error("Error creating product:", error);
    res
      .status(500)
      .json({ message: "Error creating product.", error: error.message });
  }
};

// Function to generate all variant combinations based on options
const generateVariants = (options) => {
  const generateCombinations = (options, index = 0, currentVariant = []) => {
    if (index === options.length) {
      return [currentVariant];
    }

    const optionValues = options[index].values;
    const variants = [];

    for (const value of optionValues) {
      const newVariant = [...currentVariant, value];
      variants.push(...generateCombinations(options, index + 1, newVariant));
    }

    return variants;
  };

  return generateCombinations(options);
};

module.exports = createProduct;
