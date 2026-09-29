const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const auth = require('../middleware/auth');
const Resource = require('../models/Resource');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});

const upload = multer({ storage });

// Upload File
router.post('/upload', auth, upload.single('file'), async (req, res) => {
  const { groupId } = req.body;
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

  try {
    const newResource = new Resource({
      groupId,
      uploadedBy: req.user.id,
      originalName: req.file.originalname,
      filename: req.file.filename,
      filePath: req.file.path
    });

    await newResource.save();
    res.status(201).json(newResource);
  } catch (err) {
    res.status(500).json({ message: 'Failed to upload resource' });
  }
});

// Fetch Group Resources
router.get('/:groupId', auth, async (req, res) => {
  try {
    const resources = await Resource.find({ groupId: req.params.groupId }).populate('uploadedBy', 'name');
    res.json(resources);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch resources' });
  }
});

module.exports = router;