const { body, validationResult } = require("express-validator");


function handleValidationErrors (req, res, next){
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }

const validateProduct = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ min: 3, max: 100 })
    .withMessage("Title must be between 3 and 100 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Description must not exceed 500 characters"),

  body("priceAmount")
    .notEmpty()
    .withMessage("Price amount is required")
    .isFloat({ min: 0 })
    .withMessage("Price amount must be a positive number"),

  body("priceCurrency")
    .optional()
    .isString()
    .isLength({ min: 3, max: 3 })
    .withMessage("Currency must be a 3-letter code")
    .default("INR"),

 handleValidationErrors
];

module.exports = {
  validateProduct,
};
