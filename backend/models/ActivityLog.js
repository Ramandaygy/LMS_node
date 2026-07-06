const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    user_role: {
      type: String,
      default: 'system'
    },
    user_name: {
      type: String,
      default: 'System'
    },
    action: {
      type: String,
      required: true
    },
    detail: {
      type: String,
      required: true
    },
    created_at: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false }
  }
);

module.exports = mongoose.model('ActivityLog', activityLogSchema);
