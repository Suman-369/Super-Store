const express = require('express');

const router = express.Router()
const createAuthMiddleware = require("../middlewares/auth.middleware").createAuthMiddleware
const controller = require("../controllers/saller.controller")


router.get("/matrics" , createAuthMiddleware(["seller"]), controller.getMetrics)


router.get("/orders", createAuthMiddleware(["seller"]), controller.getOrders)

router.get("/products", createAuthMiddleware(["seller"]), controller.getProducts)
module.exports = router;