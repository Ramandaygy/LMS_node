const mongoose = require('mongoose');

const materialSchema = new mongoose.Schema(
  {
    module: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Module',
      required: true,
    },

    title: {
      type: String,
      required: true,
    },

    description: {
      type: String,
      default: '',
    },

    content: {
      type: String,
      default: '',
    },

    file_url: {
      type: String,
      default: '',
    },

    file_name: {
      type: String,
      default: '',
    },

    file_size: {
      type: Number,
      default: 0,
    },

    file_type: {
      type: String,
      enum: [
        'pdf',
        'video',
        'ppt',
        'image',
        'link',
        'document',
      ],
      default: 'pdf',
    },

    external_link: {
      type: String,
      default: '',
    },

    uploaded_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    is_published: {
      type: Boolean,
      default: true,
    },

    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  'Material',
  materialSchema
);