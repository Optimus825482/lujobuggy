// ============================================
// APP STORE - Global uygulama durumu
// Demo/Live mod, tema, bildirimler
// ============================================

import { playNotificationSound, playSuccessSound } from "$lib/utils/sound";

// Uygulama modu: demo veya live
let appMode = $state<"demo" | "live">("demo");

// Ses ayarı
let soundEnabled = $state(true);

// Sidebar açık/kapalı
let sidebarOpen = $state(true);

// Bildirimler
interface Notification {
  id: number;
  type: "info" | "success" | "warning" | "error";
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

let notifications = $state<Notification[]>([]);
let nextNotificationId = 1;

// Demo simülasyon aktif mi
let demoSimulationActive = $state(false);

export const appStore = {
  // Getters
  get mode() {
    return appMode;
  },
  get isDemo() {
    return appMode === "demo";
  },
  get isLive() {
    return appMode === "live";
  },
  get sidebarOpen() {
    return sidebarOpen;
  },
  get notifications() {
    return notifications;
  },
  get unreadCount() {
    return notifications.filter((n) => !n.read).length;
  },
  get demoActive() {
    return demoSimulationActive;
  },
  get soundEnabled() {
    return soundEnabled;
  },

  // Mode actions
  setMode(mode: "demo" | "live") {
    appMode = mode;
    if (mode === "live") {
      demoSimulationActive = false;
    }
  },

  toggleMode() {
    appMode = appMode === "demo" ? "live" : "demo";
    if (appMode === "live") {
      demoSimulationActive = false;
    }
  },

  // Sidebar actions
  toggleSidebar() {
    sidebarOpen = !sidebarOpen;
  },

  setSidebarOpen(open: boolean) {
    sidebarOpen = open;
  },

  // Demo simulation
  startDemoSimulation() {
    if (appMode === "demo") {
      demoSimulationActive = true;
    }
  },

  stopDemoSimulation() {
    demoSimulationActive = false;
  },

  // Notification actions
  addNotification(type: Notification["type"], title: string, message: string) {
    const notification: Notification = {
      id: nextNotificationId++,
      type,
      title,
      message,
      timestamp: new Date(),
      read: false,
    };
    notifications = [notification, ...notifications].slice(0, 50); // Max 50 bildirim

    // Ses çal (browser ortamında)
    if (soundEnabled && typeof window !== "undefined") {
      if (type === "success") {
        playSuccessSound();
      } else if (type === "info" || type === "warning" || type === "error") {
        playNotificationSound();
      }
    }

    return notification.id;
  },

  // Ses ayarları
  toggleSound() {
    soundEnabled = !soundEnabled;
  },

  setSoundEnabled(enabled: boolean) {
    soundEnabled = enabled;
  },

  markAsRead(id: number) {
    notifications = notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n
    );
  },

  markAllAsRead() {
    notifications = notifications.map((n) => ({ ...n, read: true }));
  },

  removeNotification(id: number) {
    notifications = notifications.filter((n) => n.id !== id);
  },

  clearNotifications() {
    notifications = [];
  },
};
