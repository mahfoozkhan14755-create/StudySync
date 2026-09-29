const mongoose = require('mongoose');

const TutorSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subject: { type: String, required: true },
  hourlyRate: { type: Number, required: true },
  bio: { type: String, required: true },
  availableTimes: [{ type: String }]
});

module.exports = mongoose.model('Tutor', TutorSchema);