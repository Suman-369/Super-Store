const { tool } = require("@langchain/core/tools");
const { z } = require("zod");
const axios = require("axios");

const searchProduct = tool(
  async ({ query, token }) => {
    const response = await axios.get(
      `http://localhost:3001/api/products?q=${query}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return JSON.stringify(response.data);
  },
  {
    name: "search_product",
    description: "useful for searching products from the store",
    schema: z.object({
      query: z.string().describe("the search query"),
    }),
  }
);

const addProductToCart = tool(
  async ({ productId, qty = 1, token }) => {
    const response = await axios.post(
      "http://localhost:3002/api/cart/items",
      {
        productId,
        qty,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return `Added product with id ${productId} to cart with quantity ${qty}. Current cart total is ${response.data.totalPrice}`;
  },
  {
    name: "add_product_to_cart",
    description: "useful for adding a product to the cart",
    schema: z.object({
      productId: z
        .string()
        .describe("the id of the product to be added to cart"),
      qty: z
        .number()
        .describe("the quantity of the product to be added to cart")
        .default(1),
    }),
  }
);

module.exports = {
  search_product: searchProduct,
  add_product_to_cart: addProductToCart,
};
