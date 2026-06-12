const webpush = require('web-push');
const NotificationSubscription = require('../models/NotificationSubscription');

// Setup VAPID keys
// These keys must be in process.env or they will default to empty strings (which throws an error on push)
const publicVapidKey = process.env.VAPID_PUBLIC_KEY || 'BP2w9Lhlmt84bevfTSEMP222FqG9dTSfT-xggEAA4UFjbdf5D1iIG18mm1mdBIYVTbCTG5jIglMo-cogjFYsSB0';
const privateVapidKey = process.env.VAPID_PRIVATE_KEY || 'C2D9swkoPktBOy7zmMwpfCyUrKs74Kut01a5BwpjJrY';
const subject = process.env.VAPID_SUBJECT || 'mailto:admin@lmssmpn1suradadi.com';

webpush.setVapidDetails(subject, publicVapidKey, privateVapidKey);

exports.subscribe = async (req, res) => {
  try {
    const subscription = req.body;
    const userId = req.user.id;
    const role = req.user.role;
    let roleModel = 'users_siswa';

    if (role === 'admin') roleModel = 'users_admin';
    if (role === 'guru') roleModel = 'users_guru';
    if (role === 'ortu') roleModel = 'users_ortu';

    // Check if subscription already exists
    const existing = await NotificationSubscription.findOne({ endpoint: subscription.endpoint });
    if (existing) {
      // Update userId if it changed (same device, different login)
      existing.userId = userId;
      existing.role = role;
      existing.roleModel = roleModel;
      await existing.save();
    } else {
      await NotificationSubscription.create({
        userId,
        role,
        roleModel,
        endpoint: subscription.endpoint,
        keys: subscription.keys
      });
    }

    res.status(201).json({ success: true, message: 'Subscribed to Push Notifications successfully.' });
  } catch (error) {
    console.error('Subscription error:', error);
    res.status(500).json({ success: false, message: 'Failed to subscribe.' });
  }
};

exports.sendTestNotification = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const subscriptions = await NotificationSubscription.find({ userId });
    
    if (!subscriptions || subscriptions.length === 0) {
      return res.status(404).json({ success: false, message: 'No registered devices found for this user.' });
    }

    const payload = JSON.stringify({
      title: 'LMS Notifikasi Uji Coba',
      body: 'Halo! Push Notification Anda sudah berfungsi dengan baik.',
      icon: '/logo192.png'
    });

    const sendPromises = subscriptions.map(sub => 
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys },
        payload
      ).catch(err => {
        if (err.statusCode === 410 || err.statusCode === 404) {
          // Subscription has expired or is no longer valid
          return NotificationSubscription.findByIdAndDelete(sub._id);
        }
        console.error('Error sending notification, reason: ', err);
      })
    );

    await Promise.all(sendPromises);

    res.status(200).json({ success: true, message: 'Test notification sent.' });
  } catch (error) {
    console.error('Send test notification error:', error);
    res.status(500).json({ success: false, message: 'Failed to send test notification.' });
  }
};

// Utility function to be used by other controllers (e.g. attendance, assignments)
exports.sendPushNotification = async (userId, title, body, url = '/') => {
  try {
    const subscriptions = await NotificationSubscription.find({ userId });
    if (!subscriptions || subscriptions.length === 0) return;

    const payload = JSON.stringify({
      title,
      body,
      icon: '/logo192.png',
      data: { url }
    });

    const sendPromises = subscriptions.map(sub => 
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys },
        payload
      ).catch(err => {
        if (err.statusCode === 410 || err.statusCode === 404) {
          return NotificationSubscription.findByIdAndDelete(sub._id);
        }
      })
    );

    await Promise.all(sendPromises);
  } catch (error) {
    console.error('sendPushNotification Utility error:', error);
  }
};
