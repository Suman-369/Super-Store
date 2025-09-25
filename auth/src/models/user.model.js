const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
  },
  phoneNumber: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^\d{10}$/.test(v);
      },
      message: 'Invalid phone number'
    }
  },
  addressLine1: {
    type: String,
    required: true,
  },
  addressLine2: {
    type: String,
  },
  city: {
    type: String,
    required: true,
  },
  state: {
    type: String,
    required: true,
  },
  pincode: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^\d{6}$/.test(v);
      },
      message: 'Invalid pincode'
    }
  },
  isDefault: {
    type: Boolean,
    default: false,
  },
  type: {
    type: String,
    enum: ['home', 'work', 'other'],
    default: 'home',
  },
});

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    select:false,
  },
  fullName: {
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
  },
  role: {
    type: String,
    enum: ["seller", "user"],
    default: "user",
  },
  addresses: [addressSchema],
});

const userModel = mongoose.model("user",userSchema)

module.exports = userModel

