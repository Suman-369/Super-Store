const express = require("express");
const createAuthMiddleware = require("../middlewares/auth.middleware");
const orderController = require("../controllers/order.controller");
const validation = require("../middlewares/validator.middleware");

const router = express.Router();

router.post(
  "/",
  createAuthMiddleware(["user"]),
  validation.createOrderValidation,
  orderController.createOrder
);

router.get("/me", createAuthMiddleware(["user"]), orderController.getMyOrder);

router.post(
  "/:id/cancel",
  createAuthMiddleware(["user"]),
  orderController.cancelOrder
);

// router.patch("/orders/:id/address", createAuthMiddleware(["user"]), orderController.updateShippingAddress);
router.patch(
  "/:id/address",
  createAuthMiddleware(["user"]),
  validation.updateAddressValidation,
  orderController.updateShippingAddress
);

router.get(
  "/:id",
  createAuthMiddleware(["user", "admin"]),
  orderController.getOrderById
);

module.exports = router;
