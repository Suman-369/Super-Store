const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const app = require("../src/app");
const User = require("../src/models/user.model");
const bcrypt = require("bcryptjs");

describe("GET /api/auth/me Endpoint", () => {
  let mongoServer;
  let testUser;
  let authToken;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({});

    // Create a test user
    const hashedPassword = await bcrypt.hash("password123", 10);
    testUser = await User.create({
      username: "testuser",
      email: "test@example.com",
      password: hashedPassword,
      fullName: {
        firstName: "Test",
        lastName: "User",
      },
    });

    // Generate valid JWT token
    authToken = jwt.sign(
      {
        id: testUser._id,
        username: testUser.username,
        email: testUser.email,
        role: testUser.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );
  });

  test("should get authenticated user profile successfully", async () => {
    const response = await request(app)
      .get("/api/auth/me")
      .set("Cookie", [`token=${authToken}`])
      .expect(200);

    expect(response.body).toHaveProperty("user");
    expect(response.body.user).toHaveProperty("_id", testUser._id.toString());
    expect(response.body.user).toHaveProperty("username", testUser.username);
    expect(response.body.user).toHaveProperty("email", testUser.email);
    expect(response.body.user).toHaveProperty("fullName", testUser.fullName);
    expect(response.body.user).not.toHaveProperty("password");
  });

  test("should return 401 when no token is provided", async () => {
    const response = await request(app).get("/api/auth/me").expect(401);

    expect(response.body).toHaveProperty(
      "error",
      "Unauthorized - No token provided"
    );
  });

  test("should return 401 with invalid token", async () => {
    const response = await request(app)
      .get("/api/auth/me")
      .set("Cookie", ["token=invalidtoken"])
      .expect(401);

    expect(response.body).toHaveProperty(
      "error",
      "Unauthorized - Invalid token"
    );
  });

  test("should return 404 when user no longer exists", async () => {
    // Generate token with non-existent user ID
    const nonExistentToken = jwt.sign(
      {
        id: new mongoose.Types.ObjectId(),
        username: "deleted",
        email: "deleted@example.com",
      },
      process.env.JWT_SECRET
    );

    const response = await request(app)
      .get("/api/auth/me")
      .set("Cookie", [`token=${nonExistentToken}`])
      .expect(404);

    expect(response.body).toHaveProperty("error", "User not found");
  });

  test("should return 401 with expired token", async () => {
    // Generate expired token
    const expiredToken = jwt.sign(
      {
        id: testUser._id,
        username: testUser.username,
        email: testUser.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: "0s" } // Expire immediately
    );

    // Wait a moment to ensure token expiration
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const response = await request(app)
      .get("/api/auth/me")
      .set("Cookie", [`token=${expiredToken}`])
      .expect(401);

    expect(response.body).toHaveProperty(
      "error",
      "Unauthorized - Token expired"
    );
  });
});
