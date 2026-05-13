const express = require("express");
const router = express.Router();
const { getWorkers, createWorker } = require("../controllers/workerController");

router.get("/", getWorkers);
router.post("/", createWorker);

module.exports = router;
