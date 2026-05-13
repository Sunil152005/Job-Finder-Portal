const Job = require("../models/Job");

exports.getJobs = async(req, res) => {
  try {
    const jobs =await Job.find().sort({ createdAt: -1 });
    res.json(jobs);
  } catch (err)
  {
    res.status(500).json({ message: "Server error" });
  }
};

exports.createJob = async (req, res) => {
  try
  {
    const job =new Job(req.body);
    await job.save();
    res.status(201).json({ message: "Job created successfully" });
  } catch (err)
  {
    res.status(500).json({ message: "Server error" });
  }
};
