const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");
const app = require("../src/app");
const User = require("../src/models/user.model");
const bcrypt = require("bcryptjs");

describe("Login Endpoint", () => {
  let mongoServer;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'testsecret';
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
  });

  const testUser = {
    username: "testuser",
    email: "test@example.com",
    password: "password123",
    fullName: {
      firstName: "Test",
      lastName: "User",
    },
  };

  beforeEach(async () => {
    // Create a test user before each test
    const hashedPassword = await bcrypt.hash(testUser.password, 10);
    await User.create({
      ...testUser,
      password: hashedPassword,
    });
  });

  test("should login user successfully with correct credentials", async () => {
    const loginCredentials = {
      email: testUser.email,
      password: testUser.password,
    };

    const response = await request(app)
      .post("/api/auth/login")
      .send(loginCredentials)
      .expect(200);

    expect(response.body).toHaveProperty("message", "Login successful");
    expect(response.body).toHaveProperty("user");
    expect(response.body.user).toHaveProperty("_id");
    expect(response.body.user).toHaveProperty("username", testUser.username);
    expect(response.body.user).toHaveProperty("email", testUser.email);
    expect(response.headers["set-cookie"]).toBeDefined();
    expect(response.headers["set-cookie"][0]).toMatch(/token=/);
  });

  test("should fail with incorrect password", async () => {
    const loginCredentials = {
      email: testUser.email,
      password: "wrongpassword",
    };

    const response = await request(app)
      .post("/api/auth/login")
      .send(loginCredentials)
      .expect(401);

    expect(response.body).toHaveProperty("error", "Invalid credentials");
  });

  test("should fail with non-existent email", async () => {
    const loginCredentials = {
      email: "nonexistent@example.com",
      password: testUser.password,
    };

    const response = await request(app)
      .post("/api/auth/login")
      .send(loginCredentials)
      .expect(401);

    expect(response.body).toHaveProperty("error", "Invalid credentials");
  });

  test("should fail with missing credentials", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({})
      .expect(400);

    expect(response.body).toHaveProperty("errors");
  });
});
