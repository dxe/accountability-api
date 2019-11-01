// accomplishment model

const mongoose = require("mongoose");

const ObjectId = mongoose.Schema.ObjectId;

const accomplishmentSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  user: {
    type: ObjectId,
    required: true
  },
  text: {
    type: String
  },
  created: {
    type: Date,
    required: true,
    default: Date.now
  },
  lastUpdate: {
    type: Date,
    required: true,
    default: Date.now
  }
});

accomplishmentSchema.index({ date: 1, user: 1 }, { unique: true });

module.exports = mongoose.model("Accomplishment", accomplishmentSchema);
