const { subscribe } = require("../app")
const {consumeFromQueue} = require("../broker/broker")
const userModel = require("../models/user.model")
const productModel = require("../models/product.model")
const orderModel = require("../models/order.model")
const paymentModel = require("../models/payment.model")



module.exports = async function (){
    consumeFromQueue("AUTH_SELLER_DASHBOARD.USER_CREATED", async (user)=>{
        await userModel.create(user)
    })
    consumeFromQueue("PRODUCT_SELLER_DASHBOARD.PRODUCT_CREATED", async (product)=>{
        await productModel.create(product)
    })
    consumeFromQueue("ORDER_SELLER_DASHBOARD.ORDER_CREATED", async (order)=>{
        await orderModel.create(order)
    })

    consumeFromQueue("PAYMENT_SELLER_DASHBOARD.PAYMENT_CREATED", async (payment)=>{
        await paymentModel.create(payment)
    })
    consumeFromQueue("PAYMENT_SELLER_DASHBOARD.PAYMENT_UPDATED", async (payment)=>{
        await paymentModel.findOneAndUpdate({orderId:payment.orderId})
    })
}