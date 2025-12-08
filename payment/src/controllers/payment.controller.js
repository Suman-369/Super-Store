const PaymentModel = require("../models/payment.model");
const axios = require("axios");
const Razorpay = require("razorpay");
const {publishtoQueue} = require('../broker/broker')

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

async function createPayment(req, res) {
  const token = req.cookies.token || req.headers.authorization?.split(" ")[1];

  try {
    const orderId = req.params.orderId;

    if (!orderId) {
      return res.status(400).json({
        message: "Order ID is required",
      });
    }
    const orderResponse = await axios.get(
      "http://localhost:3003/api/orders/" + orderId,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    console.log(headers);
    

    const price = orderResponse.data.order.totalPrice;

    const order = await razorpay.orders.create(price);

    const payment = await PaymentModel.create({
      order: orderId,
      razorpayOrderId: order.id,
      user: req.user.id,
      price: {
        amount: order.amount,
        currency: order.currency,
      },
    });

    res.status(201).json({
      message: "Payment created successfully",
      payment,
    });
  } catch (error) {
    console.error("Error in createPayment:", error.message);
    res.status(500).json({
      message: "Error creating payment",
      error: error.message,
    });
  }
}

async function verifyPayment(req, res) {
  // Implementation for payment verification

  const { razorpayOrderId, paymentId, signature } = req.body;
  const secret = process.env.RAZORPAY_KEY_SECRET;

  try {
    const {
      validatePaymentVerification,
    } = require("../../node_modules/razorpay/dist/utils/razorpay-utils.js");

    const isValid = validatePaymentVerification(
      { order_id: razorpayOrderId, payment_id: paymentId },
      signature,
      secret
    );
    if (!isValid) {
      return res.status(400).json({
        message: "Invalid payment signature",
      });
    }
    const payment = await PaymentModel.findOne({ razorpayOrderId });
    if (!payment) {
      return res.status(404).json({
        message: "Payment not found",
      });
    }
    payment.paymentId = paymentId;
    payment.signature = signature;
    payment.status = "COMPLETED";
    await payment.save();

    // Publish payment success event to RabbitMQ

    await publishtoQueue("PAYMENT_NOTIFICATION.PAYMENT_COMPLETED",{
      email: req.user.email,
      orderId: payment.order,
      paymentId: payment.paymentId,
      amount: payment.price.amount /100,
      currency: payment.price.currency

    })

    res.status(200).json({
      message: "Payment verified successfully",
      payment,
    });
  } catch (error) {
    console.error("Error in verifyPayment:", error.message);
    await publishtoQueue("PAYMENT_NOTIFICATION.PAYMENT_FAILED",{
      email: req.user.email,
      paymentId: paymentId,
      orderId: razorpayOrderId
    })
    res.status(500).json({
      message: "Error verifying payment",
      error: error.message,
    });

  }
}

module.exports = { createPayment, verifyPayment };
