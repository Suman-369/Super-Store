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

router.get("/", productController.getProducts);

router.get(
  "/seller",
  createAuthMiddleware(["seller"]),
  productController.getProductsBySeller
);

router.get("/:id", productController.getProductById);

router.patch(
  "/:id",
  createAuthMiddleware(["seller"]),
  productController.updateProduct
);
router.delete(
  "/:id",
  createAuthMiddleware(["seller"]),
  productController.deleteProduct
);
module.exports = router;
