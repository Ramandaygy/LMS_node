import api from './api';

const PUBLIC_VAPID_KEY = 'BP2w9Lhlmt84bevfTSEMP222FqG9dTSfT-xggEAA4UFjbdf5D1iIG18mm1mdBIYVTbCTG5jIglMo-cogjFYsSB0';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const pushNotificationService = {
  async subscribe() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push messaging is not supported');
      return false;
    }

    try {
      // 1. Request Permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn('Notification permission denied');
        return false;
      }

      // 2. Register Service Worker
      const registration = await navigator.serviceWorker.register('/sw.js');
      
      // Wait for the Service Worker to be ready
      await navigator.serviceWorker.ready;

      // 3. Subscribe to Push Manager
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY)
        });
      }

      // 4. Send subscription to backend
      await api.post('/notifications/subscribe', subscription);
      console.log('Successfully subscribed to Push Notifications');
      return true;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      return false;
    }
  },

  async sendTestNotification() {
    try {
      const response = await api.post('/notifications/test');
      return response.data;
    } catch (error) {
      console.error('Failed to send test notification:', error);
      throw error;
    }
  }
};
