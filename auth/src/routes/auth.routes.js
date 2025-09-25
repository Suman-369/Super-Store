const express = require("express");
const router = express.Router();
const validator = require("../middlewares/validator.middleware");
const authController = require("../controllers/auth.controller");

const authMiddleware = require("../middlewares/auth.middleware");

//register

router.post(
  "/register",
  validator.registerUserValidations,
  authController.registerController
);

//login
router.post(
  "/login",
  validator.loginUserValidations,
  authController.loginController
);

//GET /api/auth/me

router.get(
  "/me",
  authMiddleware.authMiddleware,
  authController.getMeController
);

//logout

router.get("/logout", authController.logoutController);

// User addresses
router.get(
  "/users/me/addresses",
  authMiddleware.authMiddleware,
  authController.getUserAddressesController
);

router.post(
  "/users/me/addresses",
  authMiddleware.authMiddleware,
  validator.addAddressValidations,
  authController.addUserAddressController
);

router.delete(
  "/users/me/addresses/:addressId",
  authMiddleware.authMiddleware,
  authController.deleteUserAddressController
);

router.put(
  "/users/me/addresses/:addressId/default",
  authMiddleware.authMiddleware,
  authController.setDefaultAddressController
);

module.exports = router;
