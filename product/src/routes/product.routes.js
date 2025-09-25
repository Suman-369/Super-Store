const express = require("express");
const router = express.Router();
const { createAuthMiddleware } = require("../middlewares/auth.middleware");
const productController = require("../controller/product.controller");
const { validateProduct } = require("../middlewares/validator.middleware");
const upload = require("../middlewares/upload.middleware");

router.post(
  "/",
  createAuthMiddleware(["admin", "seller"]),
  upload.array("images", 5),
  validateProduct,
  productController.createProduct
);

module.exports = router;
