const mongoose = require("mongoose");

const workerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  skill: { type: String, required: true },
  experience: { type: String, required: true },
  location: { type: String, required: true },
  contact: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model("Worker", workerSchema);
