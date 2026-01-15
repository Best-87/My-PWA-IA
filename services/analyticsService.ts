
import { AnalyticsEvent, UserStats } from '../types';

const STORAGE_KEY_EVENTS = 'gemini_pwa_events';
const STORAGE_KEY_STATS = 'gemini_pwa_stats';

// Get current stats
export const getStats = (): UserStats => {
    const defaultStats: UserStats = {
        totalSessions: 0,
        lastVisit: Date.now(),
        isInstalled: false
    };
    
    try {
        const stored = localStorage.getItem(STORAGE_KEY_STATS);
        return stored ? JSON.parse(stored) : defaultStats;
    } catch {
        return defaultStats;
    }
};

// Get event history
export const getEvents = (): AnalyticsEvent[] => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY_EVENTS);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
};

// Save stats helper
const saveStats = (stats: UserStats) => {
    localStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(stats));
};

// Main tracking function
export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
    const timestamp = Date.now();
    
    // 1. Log to console (development visibility)
    console.groupCollapsed(`📊 [Analytics] ${eventName}`);
    console.log('Properties:', properties);
    console.log('Timestamp:', new Date(timestamp).toLocaleTimeString());
    console.groupEnd();

    // 2. Persist event log (limit to last 50 events to save space)
    const currentEvents = getEvents();
    const newEvent: AnalyticsEvent = { eventName, timestamp, properties };
    const updatedEvents = [newEvent, ...currentEvents].slice(0, 50);
    localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(updatedEvents));

    // 3. Update aggregated stats based on event type
    const stats = getStats();
    
    switch (eventName) {
        case 'app_session_start':
            // Logic to prevent spamming session count on simple reloads (1 hour debounce)
            if (Date.now() - stats.lastVisit > 3600000 || stats.totalSessions === 0) {
                stats.totalSessions += 1;
            }
            stats.lastVisit = Date.now();
            break;
        case 'app_installed':
            stats.isInstalled = true;
            stats.installDate = Date.now();
            break;
    }
    
    saveStats(stats);
    
    // Dispatch custom event so UI can update in real-time
    window.dispatchEvent(new CustomEvent('analytics_updated'));
};

// Initialize session
export const initAnalytics = () => {
    trackEvent('app_session_start', {
        userAgent: navigator.userAgent,
        screenSize: `${window.innerWidth}x${window.innerHeight}`,
        pwaMode: window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser'
    });
};
