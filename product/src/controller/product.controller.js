const productModel = require("../models/product.model");
const uploadImg = require("../services/Storage.service");
const mongoose = require("mongoose");
const { publishToQueue } = require("../broker/broker");



async function createProduct(req, res) {
  try {
    const { title, description, priceAmount, priceCurrency = "INR" } = req.body;
    const seller = req.user.id;

    const price = {
      amount: Number(priceAmount),
      currency: priceCurrency,
    };

    let images = [];

    if (req.files && req.files.length > 0) {
      const files = await Promise.all(
        req.files.map((file) =>
          uploadImg({ buffer: file.buffer, filename: file.originalname })
        )
      );
      images = files.map((file) => ({
        url: file.url,
        id: file.fileId,
        thumbnail: file.url,
      }));
    }

    const product = await productModel.create({
      title,
      description,
      price,
      seller,
      images,
    });


    // Publish product creation event to RabbitMQ

    await publishToQueue("PRODUCT_SELLER_DASHBOARD.PRODUCT_CREATED" , product)

    res.status(201).json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create product" });
  }
}

async function getProducts(req, res) {
  try {
    const { q, minprice, maxprice, skip = 0, limit = 20 } = req.query;

    const filter = {};

    if (q) {
      filter.$text = { $search: q };
    }

    if (minprice) {
      filter["price.amount"] = {
        ...filter["price.amount"],
        $gte: Number(minprice),
      };
    }

    if (maxprice) {
      filter["price.amount"] = {
        ...filter["price.amount"],
        $lte: Number(maxprice),
      };
    }

    const products = await productModel
      .find(filter)
      .skip(Number(skip))
      .limit(Math.min(Number(limit), 20));

    return res.status(200).json({ data: products });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch products" });
  }
}

async function getProductById(req, res) {
  try {
    const { id } = req.params;
    const product = await productModel.findById(id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    return res.status(200).json({ product });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch product" });
  }
}

async function updateProduct(req, res) {
  try {
    const { id } = req.params;

    const product = await productModel.findById(id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    const sellerId = req.user && req.user.id;
    if (!sellerId || String(product.seller) !== String(sellerId)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { title, description, priceAmount, priceCurrency } = req.body;
    const update = {};
    if (title !== undefined) update.title = title;
    if (description !== undefined) update.description = description;
    if (priceAmount !== undefined || priceCurrency !== undefined) {
      update.price = {
        amount:
          priceAmount !== undefined
            ? Number(priceAmount)
            : product.price && product.price.amount,
        currency:
          priceCurrency || (product.price && product.price.currency) || "INR",
      };
    }

    const updated = await productModel.findByIdAndUpdate(id, update, {
      new: true,
    });

    return res.status(200).json({ product: updated });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to update product" });
  }
}

async function deleteProduct(req, res) {
  try {
    const { id } = req.params;

    const product = await productModel.findById(id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    const sellerId = req.user && req.user.id;
    if (!sellerId || String(product.seller) !== String(sellerId)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await productModel.findByIdAndDelete(id);

    return res.status(200).json({ message: "Product deleted" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to delete product" });
  }
}

async function getProductsBySeller(req, res) {
  try {
    const sellerId = req.user && req.user.id;
    if (!sellerId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const {skip = 0, limit = 20} = req.query;

    const products = await productModel.find({ seller: sellerId }).skip(Number(skip)).limit(Math.min(Number(limit), 20));
    return res.status(200).json({ data: products });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to fetch seller products" });
  }
}

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getProductsBySeller,
};
