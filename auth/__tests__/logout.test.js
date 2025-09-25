const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const RedisMock = require("ioredis-mock");
const app = require("../src/app");
const User = require("../src/models/user.model");
const bcrypt = require("bcryptjs");

// Mock Redis client
jest.mock("ioredis", () => require("ioredis-mock"));

describe("GET /api/auth/logout Endpoint", () => {
  let mongoServer;
  let testUser;
  let authToken;
  let redisMock;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Initialize Redis mock
    redisMock = new RedisMock();
    // Inject the mock Redis client into the app
    app.set("redis", redisMock);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
    // Clear Redis mock
    await redisMock.flushall();
    redisMock.quit();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    // Clear Redis data before each test
    await redisMock.flushall();

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

  test("should logout successfully and clear token cookie", async () => {
    const response = await request(app)
      .get("/api/auth/logout")
      .set("Cookie", [`token=${authToken}`])
      .expect(200);

    expect(response.body).toHaveProperty("message", "Logged out successfully");

    // Check if the cookie is cleared
    const cookies = response.headers["set-cookie"];
    expect(cookies).toBeDefined();
    expect(cookies[0]).toMatch(/token=;/); // Empty token value
    expect(cookies[0]).toMatch(/Expires=/); // Should have expiry in the past
    expect(cookies[0]).toMatch(/HttpOnly/);
  });

  test("should return success even if no token is provided", async () => {
    const response = await request(app).get("/api/auth/logout").expect(200);

    expect(response.body).toHaveProperty("message", "Logged out successfully");

    // Should still send cookie clearing header
    const cookies = response.headers["set-cookie"];
    expect(cookies).toBeDefined();
    expect(cookies[0]).toMatch(/token=;/);
  });

  test("should return success with invalid token", async () => {
    const response = await request(app)
      .get("/api/auth/logout")
      .set("Cookie", ["token=invalidtoken"])
      .expect(200);

    expect(response.body).toHaveProperty("message", "Logged out successfully");

    // Should still clear the invalid cookie
    const cookies = response.headers["set-cookie"];
    expect(cookies).toBeDefined();
    expect(cookies[0]).toMatch(/token=;/);
  });

  test("should clear token with proper security attributes", async () => {
    const response = await request(app)
      .get("/api/auth/logout")
      .set("Cookie", [`token=${authToken}`])
      .expect(200);

    const cookies = response.headers["set-cookie"][0];

    // Check security attributes of cleared cookie
    expect(cookies).toMatch(/HttpOnly/);
    expect(cookies).toMatch(/Secure/);
    expect(cookies).toMatch(/SameSite/);
    expect(cookies).toMatch(/Path=\//);
  });

  test("should handle multiple logout requests", async () => {
    // First logout
    const response1 = await request(app)
      .get("/api/auth/logout")
      .set("Cookie", [`token=${authToken}`])
      .expect(200);

    expect(response1.body).toHaveProperty("message", "Logged out successfully");

    // Second logout (immediately after)
    const response2 = await request(app).get("/api/auth/logout").expect(200);

    expect(response2.body).toHaveProperty("message", "Logged out successfully");
  });
});
