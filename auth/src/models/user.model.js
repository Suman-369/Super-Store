const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema({
  details: { type: String },
  city: { type: String },
  state: { type: String },
  zip: { type: String },
  country: { type: String },
});

const userSchema = new mongoose.Schema({
  name: {
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
  address: [addressSchema],
});

const userModel = mongoose.model("user",userSchema)

module.exports = userModel

