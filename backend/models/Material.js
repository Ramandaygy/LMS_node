const mongoose = require('mongoose');

const materialSchema = new mongoose.Schema({
  module: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Module'
  },

  class_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  },

  subject_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },

  title: {
    type: String,
    required: true
  },

  description: String,

  content: String,

  file_url: String,

  file_name: String,

  file_size: Number,

  file_type: String,

  external_link: String,

  uploaded_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  is_published: {
    type: Boolean,
    default: true
  },

  order: {
    type: Number,
    default: 0
  }
});

module.exports =
mongoose.model(
  'Material',
  materialSchema
);