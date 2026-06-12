const mongoose = require('mongoose');

const notificationSubscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'roleModel'
  },
  role: {
    type: String,
    required: true,
    enum: ['admin', 'guru', 'siswa', 'ortu']
  },
  roleModel: {
    type: String,
    required: true,
    enum: ['users_admin', 'users_guru', 'users_siswa', 'users_ortu']
  },
  endpoint: {
    type: String,
    required: true
  },
  keys: {
    p256dh: { type: String, required: true },
    auth: { type: String, required: true }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// A user can have multiple devices (subscriptions), but we can optionally enforce unique endpoints
notificationSubscriptionSchema.index({ endpoint: 1 }, { unique: true });

module.exports = mongoose.model('NotificationSubscription', notificationSubscriptionSchema);
