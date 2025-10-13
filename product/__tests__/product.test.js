const request = require("supertest");
const app = require("../src/app");
const Product = require("../src/models/product.model");
const uploadImg = require("../src/services/Storage.service");

// Mock ImageKit
jest.mock("imagekit");

// Mock Product model
jest.mock("../src/models/product.model");

// Mock Storage service
jest.mock("../src/services/Storage.service");

// Mock auth middleware
jest.mock("../src/middlewares/auth.middleware", () => ({
  createAuthMiddleware: jest.fn(() => (req, res, next) => {
    req.user = { id: "507f1f77bcf86cd799439011", role: "seller" }; // Valid ObjectId
    next();
  }),
}));

describe("Product API Tests", () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe("POST /api/products", () => {
    it("should create a new product with image upload", async () => {
      // Mock uploadImg
      uploadImg.mockResolvedValueOnce({
        url: "https://ik.imagekit.io/your-account/test-image.jpg",
        fileId: "test-file-id",
      });

      // Mock Product.create
      const mockProduct = {
        _id: "507f1f77bcf86cd799439012",
        title: "Test Product",
        description: "Test Description",
        price: { amount: 99.99, currency: "INR" },
        seller: "507f1f77bcf86cd799439011",
        images: [
          {
            url: "https://ik.imagekit.io/your-account/test-image.jpg",
            id: "test-file-id",
            thumbnail: "https://ik.imagekit.io/your-account/test-image.jpg",
          },
        ],
      };
      Product.create.mockResolvedValueOnce(mockProduct);

      const response = await request(app)
        .post("/api/products")
        .field("title", "Test Product")
        .field("description", "Test Description")
        .field("priceAmount", "99.99")
        .field("priceCurrency", "INR")
        .attach("images", Buffer.from("fake image content"), "test-image.jpg");

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("_id");
      expect(response.body.title).toBe("Test Product");
      expect(response.body.description).toBe("Test Description");
      expect(response.body.price.amount).toBe(99.99);
      expect(response.body.price.currency).toBe("INR");
      expect(response.body.images).toEqual([
        {
          url: "https://ik.imagekit.io/your-account/test-image.jpg",
          id: "test-file-id",
          thumbnail: "https://ik.imagekit.io/your-account/test-image.jpg",
        },
      ]);

      // Verify uploadImg was called correctly
      expect(uploadImg).toHaveBeenCalledTimes(1);
      expect(uploadImg).toHaveBeenCalledWith(
        expect.objectContaining({
          buffer: expect.any(Buffer),
          filename: expect.any(String),
        })
      );
    });

    it("should return 400 if required fields are missing", async () => {
      const response = await request(app)
        .post("/api/products")
        .field("title", "Test Product")
        // Missing other required fields
        .attach("images", Buffer.from("fake image content"), "test-image.jpg");

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("errors");
    });

    it("should create product without images", async () => {
      // Mock Product.create
      const mockProduct = {
        _id: "507f1f77bcf86cd799439012",
        title: "Test Product",
        description: "Test Description",
        price: { amount: 99.99, currency: "INR" },
        seller: "507f1f77bcf86cd799439011",
        images: [],
      };
      Product.create.mockResolvedValueOnce(mockProduct);

      const response = await request(app)
        .post("/api/products")
        .field("title", "Test Product")
        .field("description", "Test Description")
        .field("priceAmount", "99.99")
        .field("priceCurrency", "INR");

      expect(response.status).toBe(201);
      expect(response.body.images).toEqual([]);
    });

    it("should handle upload failure", async () => {
      // Mock uploadImg failure
      uploadImg.mockRejectedValueOnce(new Error("Upload failed"));

      const response = await request(app)
        .post("/api/products")
        .field("title", "Test Product")
        .field("description", "Test Description")
        .field("priceAmount", "99.99")
        .field("priceCurrency", "INR")
        .attach("images", Buffer.from("fake image content"), "test-image.jpg");

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("GET /api/products", () => {
    it("should return a list of products", async () => {
      const mockProduct = {
        _id: "507f1f77bcf86cd799439013",
        title: "Get Product",
        description: "Get Description",
        price: { amount: 50, currency: "INR" },
        seller: "507f1f77bcf86cd799439011",
        images: [],
      };

      // Mock find chain to return results
      const mockChain = {
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValueOnce([mockProduct]),
      };
      Product.find.mockReturnValueOnce(mockChain);

      const res = await request(app).get("/api/products");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("data");
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data).toEqual([mockProduct]);
      // ensure find was called with empty filter
      expect(Product.find).toHaveBeenCalledWith({});
    });

    it("should apply query filters and pagination", async () => {
      const mockProduct = {
        _id: "507f1f77bcf86cd799439014",
        title: "Filtered Product",
        price: { amount: 200, currency: "INR" },
        seller: "507f1f77bcf86cd799439011",
        images: [],
      };

      const q = "phone";
      const minprice = "100";
      const maxprice = "300";
      const skip = "0";
      const limit = "10";

      const expectedFilter = {
        $text: { $search: q },
        "price.amount": { $gte: Number(minprice), $lte: Number(maxprice) },
      };

      const mockChain = {
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValueOnce([mockProduct]),
      };
      Product.find.mockReturnValueOnce(mockChain);

      const res = await request(app)
        .get("/api/products")
        .query({ q, minprice, maxprice, skip, limit });

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([mockProduct]);

      // Verify the find filter used matches expectedFilter
      const calledFilter = Product.find.mock.calls[0][0];
      expect(calledFilter).toEqual(expectedFilter);
      // Verify skip/limit called with numbers
      expect(mockChain.skip).toHaveBeenCalledWith(Number(skip));
      expect(mockChain.limit).toHaveBeenCalledWith(Number(limit));
    });

    it("should return 500 when the database throws", async () => {
      // Simulate an error thrown by Product.find
      Product.find.mockImplementationOnce(() => {
        throw new Error("DB failure");
      });

      const res = await request(app).get("/api/products");

      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty("error");
    });
  });

  describe("GET /api/products/:id", () => {
    it("should return a product by id", async () => {
      const mockProduct = {
        _id: "507f1f77bcf86cd799439015",
        title: "Single Product",
        description: "Single Description",
        price: { amount: 10, currency: "INR" },
        seller: "507f1f77bcf86cd799439011",
      };

      Product.findById.mockResolvedValueOnce(mockProduct);

      const res = await request(app).get(`/api/products/${mockProduct._id}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("product");
      expect(res.body.product).toEqual(mockProduct);
      expect(Product.findById).toHaveBeenCalledWith(mockProduct._id);
    });

    it("should return 404 when product not found", async () => {
      Product.findById.mockResolvedValueOnce(null);

      const res = await request(app).get(
        `/api/products/507f1f77bcf86cd799439099`
      );

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("error");
    });

    it("should return 500 when database throws", async () => {
      Product.findById.mockImplementationOnce(() => {
        throw new Error("DB find failure");
      });

      const res = await request(app).get(
        `/api/products/507f1f77bcf86cd799439099`
      );

      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty("error");
    });
  });

  describe("PATCH /api/products/:id (seller) - Update product fields", () => {
    it("should allow the seller to update their product fields", async () => {
      const productId = "507f1f77bcf86cd799439020";

      const existingProduct = {
        _id: productId,
        title: "Old Title",
        description: "Old Description",
        price: { amount: 100, currency: "INR" },
        seller: "507f1f77bcf86cd799439011",
      };

      const updatedProduct = {
        _id: productId,
        title: "New Title",
        description: "New Description",
        price: { amount: 150, currency: "INR" },
        seller: "507f1f77bcf86cd799439011",
      };

      // Seller (from mocked auth middleware) owns the product
      Product.findById.mockResolvedValueOnce(existingProduct);
      Product.findByIdAndUpdate = jest
        .fn()
        .mockResolvedValueOnce(updatedProduct);

      const res = await request(app).patch(`/api/products/${productId}`).send({
        title: "New Title",
        description: "New Description",
        priceAmount: "150",
        priceCurrency: "INR",
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("product");
      expect(res.body.product.title).toBe("New Title");
      expect(res.body.product.price.amount).toBe(150);

      // Verify update was attempted with the expected transformed fields
      expect(Product.findByIdAndUpdate).toHaveBeenCalledWith(
        productId,
        expect.objectContaining({
          title: "New Title",
          description: "New Description",
          price: { amount: 150, currency: "INR" },
        }),
        { new: true }
      );
    });

    it("should return 403 if the authenticated seller does not own the product", async () => {
      const productId = "507f1f77bcf86cd799439021";

      const existingProduct = {
        _id: productId,
        title: "Someone Else's Product",
        seller: "507f1f77bcf86cd799439999", // different seller
      };

      Product.findById.mockResolvedValueOnce(existingProduct);

      const res = await request(app)
        .patch(`/api/products/${productId}`)
        .send({ title: "Hacked Title" });

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty("error");
    });

    it("should return 404 when product to update is not found", async () => {
      const productId = "507f1f77bcf86cd799439022";

      Product.findById.mockResolvedValueOnce(null);

      const res = await request(app)
        .patch(`/api/products/${productId}`)
        .send({ title: "Doesn't matter" });

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("error");
    });

    it("should return 500 when the database throws", async () => {
      const productId = "507f1f77bcf86cd799439023";

      Product.findById.mockImplementationOnce(() => {
        throw new Error("DB failure on find");
      });

      const res = await request(app)
        .patch(`/api/products/${productId}`)
        .send({ title: "Will error" });

      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty("error");
    });
  });

  describe("DELETE /api/products/:id (seller)", () => {
    it("should allow the seller to delete their product", async () => {
      const productId = "507f1f77bcf86cd799439030";

      const existingProduct = {
        _id: productId,
        seller: "507f1f77bcf86cd799439011",
      };

      Product.findById.mockResolvedValueOnce(existingProduct);
      Product.findByIdAndDelete = jest.fn().mockResolvedValueOnce(true);

      const res = await request(app).delete(`/api/products/${productId}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("message", "Product deleted");
      expect(Product.findByIdAndDelete).toHaveBeenCalledWith(productId);
    });

    it("should return 403 if seller does not own the product", async () => {
      const productId = "507f1f77bcf86cd799439031";

      const existingProduct = {
        _id: productId,
        seller: "507f1f77bcf86cd799439999",
      };

      Product.findById.mockResolvedValueOnce(existingProduct);

      const res = await request(app).delete(`/api/products/${productId}`);

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty("error");
    });

    it("should return 404 when product not found", async () => {
      const productId = "507f1f77bcf86cd799439032";

      Product.findById.mockResolvedValueOnce(null);

      const res = await request(app).delete(`/api/products/${productId}`);

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("error");
    });

    it("should return 500 when database throws", async () => {
      const productId = "507f1f77bcf86cd799439033";

      Product.findById.mockImplementationOnce(() => {
        throw new Error("DB find failure");
      });

      const res = await request(app).delete(`/api/products/${productId}`);

      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty("error");
    });
  });

  describe("GET /api/products/seller (seller) - seller's products", () => {
    it("should return products for the authenticated seller", async () => {
      const sellerId = "507f1f77bcf86cd799439011";
      const mockProducts = [
        { _id: "1", title: "A", seller: sellerId },
        { _id: "2", title: "B", seller: sellerId },
      ];

      // Mock the model to return seller's products via chain (skip/limit)
      const mockChain = {
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValueOnce(mockProducts),
      };
      Product.find.mockReturnValueOnce(mockChain);

      const res = await request(app).get("/api/products/seller");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("data");
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data).toEqual(mockProducts);

      // Ensure find was called with filter by seller id
      expect(Product.find).toHaveBeenCalledWith({ seller: sellerId });
    });

    it("should return empty array when seller has no products", async () => {
      const mockChain = {
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValueOnce([]),
      };
      Product.find.mockReturnValueOnce(mockChain);

      const res = await request(app).get("/api/products/seller");

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });

    it("should return 500 when database throws", async () => {
      Product.find.mockImplementationOnce(() => {
        throw new Error("DB failure");
      });

      const res = await request(app).get("/api/products/seller");

      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty("error");
    });
  });
});
