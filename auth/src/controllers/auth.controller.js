const userModel = require("../models/user.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const redis = require("../db/redis");

const { publishtoQueue } = require("../broker/broker");

async function registerController(req, res) {
  try {
    const {
      username,
      email,
      password,
      fullName: { firstName, lastName },
      role,
    } = req.body;

    const isUserExist = await userModel.findOne({
      $or: [{ username }, { email }],
    });
    if (isUserExist) {
      return res.status(400).json({
        errors: [{ msg: "User already exists" }],
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await userModel.create({
      username,
      email,
      password: hashedPassword,
      name: `${firstName} ${lastName}`,
      fullName: {
        firstName,
        lastName,
      },
      role,
    });

    // Publish user registration event to RabbitMQ
    await Promise.all([
      publishtoQueue("AUTH_NOTIFICATION.USER_CREATED", {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
      }),
      publishtoQueue("AUTH_SELLER_DASHBOARD.USER_CREATED", user),
    ]);

    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      maxAge: 24 * 60 * 60 * 1000, //1 day
    });

    res.status(201).json({
      message: "User registered successfully",
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        name: user.name,
        fullName: user.fullName,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function loginController(req, res) {
  try {
    const { username, email, password } = req.body;

    // Find user by email
    const user = await userModel
      .findOne({ $or: [{ username }, { email }] })
      .select("+password");
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Compare password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // Set cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    // Send response
    res.status(200).json({
      message: "Login successful",
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        name: user.name,
        fullName: user.fullName,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
async function getMeController(req, res) {
  try {
    const { password, ...userWithoutPassword } = req.user.toObject();
    return res.status(200).json({ user: userWithoutPassword });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function logoutController(req, res) {
  try {
    const token = req.cookies.token;

    if (token) {
      await redis.set(`blacklist:${token}`, "true", "EX", 24 * 60 * 60); // Set expiry to match token expiry
    }

    res.clearCookie("token", {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
    });
    return res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function getUserAddressesController(req, res) {
  const id = req.user._id;

  try {
    const user = await userModel.findById(id).select("addresses");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    return res.status(200).json({
      message: "User addresses fetched successfully",
      addresses: user.addresses,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function addUserAddressController(req, res) {
  try {
    const userId = req.user._id;
    const addressData = req.body;

    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const isFirstAddress = user.addresses.length === 0;
    const newAddress = {
      ...addressData,
      isDefault: isFirstAddress,
    };

    user.addresses.push(newAddress);
    await user.save();

    res.status(201).json({
      message: "Address added successfully",
      address: user.addresses[user.addresses.length - 1],
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function deleteUserAddressController(req, res) {
  try {
    const userId = req.user._id;
    const addressId = req.params.addressId;

    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const addressIndex = user.addresses.findIndex(
      (addr) => addr._id.toString() === addressId
    );
    if (addressIndex === -1) {
      return res.status(404).json({ error: "Address not found" });
    }

    const deletedAddress = user.addresses[addressIndex];
    user.addresses.splice(addressIndex, 1);

    if (deletedAddress.isDefault && user.addresses.length > 0) {
      user.addresses[0].isDefault = true;
    }

    await user.save();

    res.status(200).json({ message: "Address deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function setDefaultAddressController(req, res) {
  try {
    const userId = req.user._id;
    const addressId = req.params.addressId;

    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const addressIndex = user.addresses.findIndex(
      (addr) => addr._id.toString() === addressId
    );
    if (addressIndex === -1) {
      return res.status(404).json({ error: "Address not found" });
    }

    user.addresses.forEach((addr) => (addr.isDefault = false));
    user.addresses[addressIndex].isDefault = true;

    await user.save();

    res.status(200).json({ message: "Address marked as default" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  registerController,
  loginController,
  getMeController,
  logoutController,
  getUserAddressesController,
  addUserAddressController,
  deleteUserAddressController,
  setDefaultAddressController,
};
