const Product = require("../models/product.model");
const uploadImg = require("../services/Storage.service");

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
      images = files.map(file => ({
        url: file.url,
        id: file.fileId,
        thumbnail: file.url, // Assuming thumbnail is same as url for now
      }));
    }

    const product = await Product.create({
      title,
      description,
      price,
      seller,
      images
    });

    res.status(201).json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create product" });
  }
}

module.exports = { createProduct };
