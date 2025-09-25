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
        images: [{
          url: "https://ik.imagekit.io/your-account/test-image.jpg",
          id: "test-file-id",
          thumbnail: "https://ik.imagekit.io/your-account/test-image.jpg"
        }]
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
      expect(response.body.images).toEqual([{
        url: "https://ik.imagekit.io/your-account/test-image.jpg",
        id: "test-file-id",
        thumbnail: "https://ik.imagekit.io/your-account/test-image.jpg"
      }]);

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
        images: []
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
});
