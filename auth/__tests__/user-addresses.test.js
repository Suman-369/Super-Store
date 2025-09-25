const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const app = require("../src/app");
const User = require("../src/models/user.model");
const bcrypt = require("bcryptjs");

describe("User Addresses API Endpoints", () => {
  let mongoServer;
  let testUser;
  let authToken;
  let testAddress;

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
      addresses: [],
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

    // Create a test address
    testAddress = {
      fullName: "John Doe",
      phoneNumber: "9876543210",
      addressLine1: "123 Test Street",
      addressLine2: "Apt 456",
      city: "Test City",
      state: "Test State",
      pincode: "560001",
      isDefault: false,
      type: "home",
    };
  });

  describe("GET /api/auth/users/me/addresses", () => {
    test("should return empty address list for new user", async () => {
      const response = await request(app)
        .get("/api/auth/users/me/addresses")
        .set("Cookie", [`token=${authToken}`])
        .expect(200);

      expect(response.body).toHaveProperty("addresses");
      expect(response.body.addresses).toBeInstanceOf(Array);
      expect(response.body.addresses).toHaveLength(0);
    });

    test("should return list of saved addresses", async () => {
      // First add an address
      await request(app)
        .post("/api/auth/users/me/addresses")
        .set("Cookie", [`token=${authToken}`])
        .send(testAddress);

      const response = await request(app)
        .get("/api/auth/users/me/addresses")
        .set("Cookie", [`token=${authToken}`])
        .expect(200);

      expect(response.body.addresses).toHaveLength(1);
      expect(response.body.addresses[0]).toMatchObject({
        ...testAddress,
        isDefault: true,
        _id: expect.any(String),
      });
    });

    test("should return 401 without auth token", async () => {
      await request(app).get("/api/auth/users/me/addresses").expect(401);
    });
  });

  describe("POST /api/auth/users/me/addresses", () => {
    test("should add new address successfully", async () => {
      const response = await request(app)
        .post("/api/auth/users/me/addresses")
        .set("Cookie", [`token=${authToken}`])
        .send(testAddress)
        .expect(201);

      expect(response.body).toHaveProperty(
        "message",
        "Address added successfully"
      );
      expect(response.body).toHaveProperty("address");
      expect(response.body.address).toMatchObject({ ...testAddress, isDefault: true });
      expect(response.body.address).toHaveProperty("_id");
    });

    test("should validate phone number format", async () => {
      const invalidAddress = {
        ...testAddress,
        phoneNumber: "123", // Invalid phone number
      };

      const response = await request(app)
        .post("/api/auth/users/me/addresses")
        .set("Cookie", [`token=${authToken}`])
        .send(invalidAddress)
        .expect(400);

      expect(response.body).toHaveProperty("errors");
      expect(response.body.errors[0].msg).toContain("Invalid phone number");
    });

    test("should validate pincode format", async () => {
      const invalidAddress = {
        ...testAddress,
        pincode: "12345", // Invalid pincode (should be 6 digits)
      };

      const response = await request(app)
        .post("/api/auth/users/me/addresses")
        .set("Cookie", [`token=${authToken}`])
        .send(invalidAddress)
        .expect(400);

      expect(response.body).toHaveProperty("errors");
      expect(response.body.errors[0].msg).toContain("Invalid pincode");
    });

    test("should set as default if it's the first address", async () => {
      const response = await request(app)
        .post("/api/auth/users/me/addresses")
        .set("Cookie", [`token=${authToken}`])
        .send(testAddress)
        .expect(201);

      expect(response.body.address.isDefault).toBe(true);
    });

    test("should not set as default if it's not the first address", async () => {
      // Add first address
      await request(app)
        .post("/api/auth/users/me/addresses")
        .set("Cookie", [`token=${authToken}`])
        .send(testAddress);

      // Add second address
      const secondAddress = {
        ...testAddress,
        addressLine1: "456 Second Street",
      };

      const response = await request(app)
        .post("/api/auth/users/me/addresses")
        .set("Cookie", [`token=${authToken}`])
        .send(secondAddress)
        .expect(201);

      expect(response.body.address.isDefault).toBe(false);
    });
  });

  describe("DELETE /api/auth/users/me/addresses/:addressId", () => {
    let savedAddressId;

    beforeEach(async () => {
      // Add an address to delete
      const response = await request(app)
        .post("/api/auth/users/me/addresses")
        .set("Cookie", [`token=${authToken}`])
        .send(testAddress);

      savedAddressId = response.body.address._id;
    });

    test("should delete address successfully", async () => {
      const response = await request(app)
        .delete(`/api/auth/users/me/addresses/${savedAddressId}`)
        .set("Cookie", [`token=${authToken}`])
        .expect(200);

      expect(response.body).toHaveProperty(
        "message",
        "Address deleted successfully"
      );

      // Verify address is deleted
      const listResponse = await request(app)
        .get("/api/auth/users/me/addresses")
        .set("Cookie", [`token=${authToken}`]);

      expect(listResponse.body.addresses).toHaveLength(0);
    });

    test("should return 404 for non-existent address", async () => {
      const fakeAddressId = new mongoose.Types.ObjectId();

      await request(app)
        .delete(`/api/auth/users/me/addresses/${fakeAddressId}`)
        .set("Cookie", [`token=${authToken}`])
        .expect(404);
    });

    test("should reassign default address when deleting default address", async () => {
      // Add a second address
      const secondAddress = {
        ...testAddress,
        addressLine1: "456 Second Street",
      };
      await request(app)
        .post("/api/auth/users/me/addresses")
        .set("Cookie", [`token=${authToken}`])
        .send(secondAddress);

      // Delete the first (default) address
      await request(app)
        .delete(`/api/auth/users/me/addresses/${savedAddressId}`)
        .set("Cookie", [`token=${authToken}`])
        .expect(200);

      // Check if second address became default
      const listResponse = await request(app)
        .get("/api/auth/users/me/addresses")
        .set("Cookie", [`token=${authToken}`]);

      expect(listResponse.body.addresses).toHaveLength(1);
      expect(listResponse.body.addresses[0].isDefault).toBe(true);
    });

    test("should return 401 without auth token", async () => {
      await request(app)
        .delete(`/api/auth/users/me/addresses/${savedAddressId}`)
        .expect(401);
    });
  });

  describe("PUT /api/auth/users/me/addresses/:addressId/default", () => {
    let firstAddressId;
    let secondAddressId;

    beforeEach(async () => {
      // Add two addresses
      const firstResponse = await request(app)
        .post("/api/auth/users/me/addresses")
        .set("Cookie", [`token=${authToken}`])
        .send(testAddress);
      firstAddressId = firstResponse.body.address._id;

      const secondResponse = await request(app)
        .post("/api/auth/users/me/addresses")
        .set("Cookie", [`token=${authToken}`])
        .send({
          ...testAddress,
          addressLine1: "456 Second Street",
        });
      secondAddressId = secondResponse.body.address._id;
    });

    test("should mark address as default", async () => {
      const response = await request(app)
        .put(`/api/auth/users/me/addresses/${secondAddressId}/default`)
        .set("Cookie", [`token=${authToken}`])
        .expect(200);

      expect(response.body).toHaveProperty(
        "message",
        "Address marked as default"
      );

      // Verify changes
      const listResponse = await request(app)
        .get("/api/auth/users/me/addresses")
        .set("Cookie", [`token=${authToken}`]);

      const addresses = listResponse.body.addresses;
      const newDefaultAddress = addresses.find(
        (addr) => addr._id === secondAddressId
      );
      const oldDefaultAddress = addresses.find(
        (addr) => addr._id === firstAddressId
      );

      expect(newDefaultAddress.isDefault).toBe(true);
      expect(oldDefaultAddress.isDefault).toBe(false);
    });

    test("should return 404 for non-existent address", async () => {
      const fakeAddressId = new mongoose.Types.ObjectId();

      await request(app)
        .put(`/api/auth/users/me/addresses/${fakeAddressId}/default`)
        .set("Cookie", [`token=${authToken}`])
        .expect(404);
    });
  });
});
