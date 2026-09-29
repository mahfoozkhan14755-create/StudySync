const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Group = require('../models/Group');

// Create Group
router.post('/create', auth, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: 'Group name is required' });

  try {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const newGroup = new Group({
      name,
      code,
      createdBy: req.user.id,
      members: [req.user.id]
    });

    await newGroup.save();
    res.status(201).json(newGroup);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create group' });
  }
});

// Join Group by Code
router.post('/join', auth, async (req, res) => {
  const { code } = req.body;
  try {
    const group = await Group.findOne({ code: code.toUpperCase() });
    if (!group) return res.status(404).json({ message: 'Group not found' });

    if (group.members.includes(req.user.id)) {
      return res.status(400).json({ message: 'Already a member of this group' });
    }

    group.members.push(req.user.id);
    await group.save();
    res.json(group);
  } catch (err) {
    res.status(500).json({ message: 'Failed to join group' });
  }
});

// Fetch User Groups
router.get('/my-groups', auth, async (req, res) => {
  try {
    const groups = await Group.find({ members: req.user.id });
    res.json(groups);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch groups' });
  }
});

module.exports = router;