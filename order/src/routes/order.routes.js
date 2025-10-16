const express = require('express');
const createAuthMiddleware = require('../middlewares/auth.middleware');
const {createOrder}  = require('../controllers/order.controller');
const validation = require("../middlewares/validator.middleware")

const router = express.Router();

router.post("/", createAuthMiddleware(["user"]),validation.createOrderValidation ,createOrder);

module.exports = router
