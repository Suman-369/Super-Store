const userModel = require("../models/user.model");
const productModel = require("../models/product.model");
const orderModel = require("../models/order.model");
const paymentModel = require("../models/payment.model");

async function getMetrics(req, res) {
  try {
    const sellerId = req.user._id;

    // Get all products of the seller
    const products = await productModel
      .find({ seller: sellerId })
      .select("_id title");
    const productIds = products.map((p) => p._id);

    if (productIds.length === 0) {
      return res.json({ sales: 0, revenue: 0, topProduct: null });
    }

    // Sales: Number of delivered orders containing seller's products
    const sales = await orderModel.countDocuments({
      "items.product": { $in: productIds },
      status: "DELIVERED",
    });

    // Revenue: Sum of totalPrice for delivered orders
    const revenueResult = await orderModel.aggregate([
      { $match: { "items.product": { $in: productIds }, status: "DELIVERED" } },
      { $group: { _id: null, total: { $sum: "$totalPrice.amount" } } },
    ]);
    const revenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

    // Top Product: Product with most quantity sold
    const topProductResult = await orderModel.aggregate([
      { $match: { "items.product": { $in: productIds }, status: "DELIVERED" } },
      { $unwind: "$items" },
      { $match: { "items.product": { $in: productIds } } },
      {
        $group: {
          _id: "$items.product",
          totalQuantity: { $sum: "$items.quantity" },
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 1 },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      { $project: { title: "$product.title", quantitySold: "$totalQuantity" } },
    ]);

    const topProduct = topProductResult.length > 0 ? topProductResult[0] : null;

    res.json({ sales, revenue, topProduct });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function getOrders(req, res) {
  try {
    const sellerId = req.user._id;

    // Get all products of the seller
    const products = await productModel
      .find({ seller: sellerId })
      .select("_id");
    const productIds = products.map((p) => p._id);

    if (productIds.length === 0) {
      return res.json({ orders: [] });
    }

    // Find orders containing seller's products
    const orders = await orderModel
      .find({
        "items.product": { $in: productIds },
      })
      .populate("user", "name email") // populate user details
      .populate("items.product", "title price images") // populate product details
      .sort({ createdAt: -1 }); // sort by newest first

    res.json({ orders });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function getProducts(req, res) {
  try {
    const sellerId = req.user._id;

    // Find all products of the seller
    const products = await productModel
      .find({ seller: sellerId })
      .sort({ createdAt: -1 });

    res.json({ products });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

module.exports = {
  getMetrics,
  getOrders,
  getProducts,
};
