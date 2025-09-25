const { body, validationResult } = require("express-validator");

const responseWithValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

const registerUserValidations = [
  body("username").notEmpty().withMessage("Username is required").isString(),
  body("email").isEmail().withMessage("Valid email is required"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
  body("fullName.firstName")
    .notEmpty()
    .withMessage("First name is required")
    .isString(),
  body("fullName.lastName")
    .notEmpty()
    .withMessage("Last name is required")
    .isString(),
  body("role").optional().isIn(["user", "seller"]).withMessage("Role must be either user or seller"),
  responseWithValidationErrors,
];

const loginUserValidations = [
  body("email").optional().isEmail().withMessage("Valid email is required"),
  body("username").optional().isString(),
  body().custom((value, { req }) => {
    if (!req.body.email && !req.body.username) {
      throw new Error('Either email or username is required');
    }
    return true;
  }),
  body("password").notEmpty().withMessage("Password is required"),
  responseWithValidationErrors,
];

const addAddressValidations = [
  body("fullName").notEmpty().withMessage("Full name is required").isString(),
  body("phoneNumber")
    .notEmpty()
    .withMessage("Phone number is required")
    .matches(/^\d{10}$/)
    .withMessage("Invalid phone number"),
  body("addressLine1").notEmpty().withMessage("Address line 1 is required").isString(),
  body("addressLine2").optional().isString(),
  body("city").notEmpty().withMessage("City is required").isString(),
  body("state").notEmpty().withMessage("State is required").isString(),
  body("pincode")
    .notEmpty()
    .withMessage("Pincode is required")
    .matches(/^\d{6}$/)
    .withMessage("Invalid pincode"),
  body("type").optional().isIn(['home', 'work', 'other']).withMessage("Type must be home, work, or other"),

  responseWithValidationErrors,
];

module.exports = {
  registerUserValidations,
  loginUserValidations,
  addAddressValidations,
};


