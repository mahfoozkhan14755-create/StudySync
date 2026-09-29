const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Tutor = require('../models/Tutor');

// Register as Tutor
router.post('/register', auth, async (req, res) => {
  const { subject, hourlyRate, bio, availableTimes } = req.body;
  try {
    let tutor = await Tutor.findOne({ userId: req.user.id });
    if (tutor) return res.status(400).json({ message: 'Already registered as tutor' });

    tutor = new Tutor({ userId: req.user.id, subject, hourlyRate, bio, availableTimes });
    await tutor.save();
    res.status(201).json(tutor);
  } catch (err) {
    res.status(500).json({ message: 'Failed to register tutor' });
  }
});

// Fetch All Tutors
router.get('/', async (req, res) => {
  try {
    const tutors = await Tutor.find().populate('userId', 'name email');
    res.json(tutors);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch tutors' });
  }
});

module.exports = router;