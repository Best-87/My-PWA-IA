
// Check if notifications are supported
export const isNotificationSupported = (): boolean => {
    // Skip in preview environments to prevent origin mismatch errors
    const isPreview = window.location.hostname.includes('scf.usercontent.goog') || 
                      window.location.hostname.includes('webcontainer') ||
                      window.location.hostname.includes('ai.studio');
    
    if (isPreview) return false;

    return 'Notification' in window && 'serviceWorker' in navigator;
};

// Request Permission
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
    if (!isNotificationSupported()) return 'denied';
    const permission = await Notification.requestPermission();
    return permission;
};

// Get current permission state
export const getNotificationPermission = (): NotificationPermission => {
    if (!isNotificationSupported()) return 'denied';
    return Notification.permission;
};

// Send a Local Notification (doesn't require a backend server)
export const sendLocalNotification = async (title: string, body: string, url: string = './') => {
    if (!isNotificationSupported() || Notification.permission !== 'granted') return;

    try {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(title, {
            body,
            // In a real app, use relative paths to assets in public folder
            icon: 'https://picsum.photos/192/192', 
            badge: 'https://picsum.photos/96/96',
            vibrate: [100, 50, 100],
            tag: 'conferente-notification', // Groups notifications
            data: { url }
        } as any);
    } catch (error) {
        console.error('Error sending notification:', error);
    }
};