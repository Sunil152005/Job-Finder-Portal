const Worker = require("../models/Worker");

exports.getWorkers = async (req, res) => {
  try {
    const workers = await Worker.find().sort({ createdAt: -1 });
    res.json(workers);
  } catch (err) 
  {
    res.status(500).json({ message: "Server error" });
  }
};

exports.createWorker = async (req, res) => {
  try 
  {
    const worker = new Worker(req.body);
    await worker.save();
    res.status(201).json({ message: "Worker registered successfully" });
  } catch (err) 
  {
    res.status(500).json({ message: "Server error" });
  }
};
