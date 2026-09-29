const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const auth = require('../middleware/auth');
const Group = require('../models/Group');

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage });

// Upload File to Group
router.post('/upload/:groupId', auth, upload.single('file'), async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const newResource = {
      fileName: req.file.originalname,
      fileUrl: `/uploads/${req.file.filename}`,
      uploadedBy: req.user.id
    };

    group.resources.push(newResource);
    await group.save();

    res.status(201).json({ message: 'File uploaded successfully', resource: newResource });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;