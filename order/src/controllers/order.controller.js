const orderModel = require("../model/order.model");
const axios = require("axios");

async function createOrder(req, res) {
  const user = req.user;

  const token = req.cookies?.token || req.headers?.authorization?.split(" ")[1];

  try {
    // basic validation: shipping address required
    if (!req.body || !req.body.shippingAddress) {
      return res.status(400).json({ errors: ["shippingAddress is required"] });
    }
    //fetch user cart details from cart service

    const cartResponse = await axios.get("http://localhost:3002/api/cart", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    // if cart is empty, treat as an error (tests expect 500 in this case)
    if (
      !cartResponse?.data?.cart ||
      !Array.isArray(cartResponse.data.cart.items) ||
      cartResponse.data.cart.items.length === 0
    ) {
      throw new Error("Cart is empty");
    }

    const products = await Promise.all(
      cartResponse.data.cart.items.map(async (item) => {
        return (
          await axios.get(
            `http://localhost:3001/api/products/${item.productId}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          )
        ).data.product;
      })
    );

    let priceAmount = 0;

    const orderItems = cartResponse.data.cart.items.map((item) => {
      const product = products.find((p) => p._id.toString() === item.productId);

      // if not in stock

      if (product.stock < item.quantity) {
        throw new Error(`Product ${product.title} is out of stock`);
      }

      priceAmount += product.price.amount * item.quantity;
      return {
        product: item.productId,
        quantity: item.quantity,
        price: product.price,
      };
    });

    const order = await orderModel.create({
      user: user.id,
      items: orderItems,
      status: "PENDING",
      totalPrice: {
        amount: priceAmount,
        currency: "INR",
      },
      shippingAddress: req.body.shippingAddress,
    });


    await publishToQueue("ORDER_SELLER_DASHBOARD.ORDER_CREATED", order)

    res.status(201).json({
      message: "Order created successfully",
      order,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
}

async function getMyOrder(req, res) {
  const user = req.user;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  try {
    const orders = await orderModel.find({ user: user.id });
    const totalOrders = await orderModel.countDocuments({ user: user.id });
    res.status(200).json({
      message: "Orders fetched successfully",
      orders,
      meta: {
        total: totalOrders,
        page: page,
        limit: limit,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
}

async function getOrderById(req, res) {
  const user = req.user;
  const orderId = req.params.id;

  try {
    const order = await orderModel.findById(orderId);
    if (!order) {
      return res.status(404).json({
        message: "Order Not Found",
      });
    }

    if (order.user.toString() !== user.id) {
      return res.status(403).json({
        message: "Forbidden: You don't have access to this order",
      });
    }
  } catch (error) {
    res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
}

async function cancelOrder(req, res) {
  const user = req.user;
  const orderId = req.params.id;

  try {
    const order = await orderModel.findById(orderId);
    if (!order) {
      return res.status(404).json({
        message: "Order Not Found",
      });
    }
    if (order.user.toString() !== user.id) {
      return res.status(403).json({
        message: "Forbidden: You don't have access to cancel this order",
      });
    }

    if (order.status === "CANCELLED") {
      return res.status(400).json({
        message: "Order is already cancelled",
      });
    }
    order.status = "CANCELLED";
    await order.save();
    res.status(200).json({
      message: "Order cancelled successfully",
      order,
    });
  } catch (error) {
    res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
}

async function updateShippingAddress(req, res) {
  const user = req.user;
  const orderId = req.params.id;
  const shippingAddress = req.body?.shippingAddress;

  if (!shippingAddress) {
    return res.status(400).json({ errors: ["shippingAddress is required"] });
  }

  // simple validation: require street, city, state, pincode/zip and country
  const missing = [];
  if (!shippingAddress.street) missing.push("street");
  if (!shippingAddress.city) missing.push("city");
  if (!shippingAddress.state) missing.push("state");
  if (!shippingAddress.country) missing.push("country");
  if (
    !shippingAddress.pincode &&
    !shippingAddress.zip &&
    !shippingAddress.postalCode
  )
    missing.push("pincode");

  if (missing.length) {
    return res
      .status(400)
      .json({ errors: missing.map((f) => `${f} is required`) });
  }

  try {
    const order = await orderModel.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order Not Found" });
    }

    if (order.user.toString() !== user.id) {
      return res
        .status(403)
        .json({
          message: "Forbidden: You don't have access to update this order",
        });
    }

    // allow updates only before capture/shipping
    if (order.status && order.status !== "PENDING") {
      return res
        .status(409)
        .json({ message: "Address update not allowed at this stage" });
    }

    // normalize and persist using schema field `pincode`
    const pincodeVal =
      shippingAddress.pincode ||
      shippingAddress.zip ||
      shippingAddress.postalCode;
    order.shippingAddress = {
      street: shippingAddress.street,
      city: shippingAddress.city,
      state: shippingAddress.state,
      pincode: pincodeVal,
      country: shippingAddress.country,
    };

    await order.save();

    // convert to plain object and include `zip` for test convenience (map from pincode)
    const resp = order.toObject ? order.toObject() : order;
    if (resp.shippingAddress) {
      resp.shippingAddress.zip = pincodeVal;
    }

    res.status(200).json({ order: resp });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
}

module.exports = {
  createOrder,
  getMyOrder,
  getOrderById,
  cancelOrder,
  updateShippingAddress,
};
