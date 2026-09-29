const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Quiz = require('../models/Quiz');

// Create Quiz
router.post('/create', auth, async (req, res) => {
  const { groupId, title, questions } = req.body;
  try {
    const quiz = new Quiz({ groupId, title, questions, createdBy: req.user.id });
    await quiz.save();
    res.status(201).json(quiz);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create quiz' });
  }
});

// Get Group Quizzes
router.get('/:groupId', auth, async (req, res) => {
  try {
    const quizzes = await Quiz.find({ groupId: req.params.groupId });
    res.json(quizzes);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch quizzes' });
  }
});

module.exports = router;