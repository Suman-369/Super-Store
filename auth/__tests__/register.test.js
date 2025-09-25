const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");
const app = require("../src/app");
const User = require("../src/models/user.model");

describe("Register Endpoint", () => {
  let mongoServer;

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
  });

  const validUserData = {
    username: "testuser",
    email: "test@example.com",
    password: "password123",
    fullName: {
      firstName: "Test",
      lastName: "User",
    },
    name: "Test User",
  };

  test("should register a new user successfully", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .set("Content-Type", "application/json")
      .set("Accept", "*/*")
      .set("Cache-Control", "no-cache")
      .set("Connection", "keep-alive")
      .send(validUserData)
      .expect(201);

    expect(response.body).toHaveProperty(
      "message",
      "User registered successfully"
    );
    expect(response.body).toHaveProperty("user");
    expect(response.body.user).toHaveProperty("_id");
    expect(response.body.user.email).toBe(validUserData.email);
    expect(response.body.user.name).toBe('Test User');

    // Check if user was actually saved in the database
    const user = await User.findOne({ email: validUserData.email });
    expect(user).toBeTruthy();
    expect(user.name).toBe('Test User');
    expect(user.fullName.firstName).toBe(validUserData.fullName.firstName);
    expect(user.fullName.lastName).toBe(validUserData.fullName.lastName);
  });

  test("should not register user with existing email", async () => {
    // First create a user
    await User.create(validUserData);

    // Try to create another user with the same email
    const response = await request(app)
      .post("/api/auth/register")
      .set("Content-Type", "application/json")
      .set("Accept", "*/*")
      .set("Cache-Control", "no-cache")
      .set("Connection", "keep-alive")
      .send(validUserData)
      .expect(400);

    expect(response.body).toHaveProperty("errors");
  });

  test("should not register user with missing required fields", async () => {
    const invalidUserData = {
      email: "test@example.com",
      password: "123", // too short password
    };

    const response = await request(app)
      .post("/api/auth/register")
      .set("Content-Type", "application/json")
      .set("Accept", "*/*")
      .set("Cache-Control", "no-cache")
      .set("Connection", "keep-alive")
      .send(invalidUserData)
      .expect(400);

    expect(response.body).toHaveProperty("errors");
  });
});
