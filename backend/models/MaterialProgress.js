const mongoose = require('mongoose');

const materialProgressSchema =
new mongoose.Schema({

  material: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Material',
    required: true
  },

  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  completed: {
    type: Boolean,
    default: false
  },

  progress_percent: {
    type: Number,
    default: 0
  },

  current_slide: {
    type: Number,
    default: 0
  },

  total_slides: {
    type: Number,
    default: 1
  },

  completed_at: {
    type: Date,
    default: null
  }

},
{
  timestamps: true
});

module.exports =
mongoose.model(
  'MaterialProgress',
  materialProgressSchema
);