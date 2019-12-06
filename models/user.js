// user model

const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  phone: {
    type: String,
    default: '',
  },
  alert: {
    type: Boolean,
    required: true,
    default: false
  },
  alertTime: {
    type: String,
    default: "21:00"
  },
  backgroundColor: {
    type: String,
    required: true,
    default: "#5900b3"
  },
  lastLoginDate: {
    type: Date
  }
});

module.exports = mongoose.model("User", userSchema);
