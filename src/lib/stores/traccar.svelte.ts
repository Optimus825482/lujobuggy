/**
 * Traccar Store - Canlı GPS Takip
 *
 * WebSocket ile Traccar sunucusundan canlı konum güncellemeleri alır
 */

import { browser } from "$app/environment";

// Types
interface TraccarPosition {
  deviceId: number;
  latitude: number;
  longitude: number;
  speed: number;
  course: number;
  serverTime: string;
  valid: boolean;
}

interface TraccarDevice {
  id: number;
  name: string;
  uniqueId: string;
  status: "online" | "offline" | "unknown";
}

interface TraccarEvent {
  type: string;
  deviceId: number;
  geofenceId?: number;
  eventTime: string;
}

// Store state
let positions = $state<Map<number, TraccarPosition>>(new Map());
let devices = $state<Map<number, TraccarDevice>>(new Map());
let connected = $state(false);
let lastUpdate = $state<Date | null>(null);
let error = $state<string | null>(null);

// WebSocket instance
let ws: WebSocket | null = null;
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY = 3000;

// Event callbacks
type PositionCallback = (position: TraccarPosition) => void;
type EventCallback = (event: TraccarEvent) => void;
const positionCallbacks: Set<PositionCallback> = new Set();
const eventCallbacks: Set<EventCallback> = new Set();

/**
 * WebSocket bağlantısını başlatır
 */
export function connect(traccarUrl: string, email: string, password: string) {
  if (!browser) return;
  if (ws?.readyState === WebSocket.OPEN) return;

  // URL'i WebSocket formatına çevir
  const wsProtocol = traccarUrl.startsWith("https") ? "wss" : "ws";
  const baseUrl = traccarUrl.replace(/^https?:\/\//, "");

  // Basic auth ile WebSocket bağlantısı
  const auth = btoa(`${email}:${password}`);
  const wsUrl = `${wsProtocol}://${baseUrl}/api/socket`;

  console.log("Connecting to Traccar WebSocket:", wsUrl);

  try {
    // WebSocket bağlantısı - auth header'ı URL'de göndermek gerekiyor
    // Traccar WebSocket için önce HTTP session oluşturmak gerekiyor
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("Traccar WebSocket connected");
      connected = true;
      error = null;
      reconnectAttempts = 0;
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleMessage(data);
      } catch (e) {
        console.error("Failed to parse WebSocket message:", e);
      }
    };

    ws.onerror = (e) => {
      console.error("Traccar WebSocket error:", e);
      error = "WebSocket bağlantı hatası";
    };

    ws.onclose = (e) => {
      console.log("Traccar WebSocket closed:", e.code, e.reason);
      connected = false;
      ws = null;

      // Otomatik yeniden bağlan
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        console.log(
          `Reconnecting in ${RECONNECT_DELAY}ms (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`
        );
        reconnectTimeout = setTimeout(
          () => connect(traccarUrl, email, password),
          RECONNECT_DELAY
        );
      } else {
        error = "Bağlantı kurulamadı. Lütfen sayfayı yenileyin.";
      }
    };
  } catch (e) {
    console.error("Failed to create WebSocket:", e);
    error = String(e);
  }
}

/**
 * WebSocket bağlantısını kapatır
 */
export function disconnect() {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
  if (ws) {
    ws.close();
    ws = null;
  }
  connected = false;
}

/**
 * WebSocket mesajını işler
 */
function handleMessage(data: any) {
  lastUpdate = new Date();

  // Positions update
  if (data.positions) {
    for (const pos of data.positions) {
      positions.set(pos.deviceId, {
        deviceId: pos.deviceId,
        latitude: pos.latitude,
        longitude: pos.longitude,
        speed: pos.speed * 1.852, // knots to km/h
        course: pos.course,
        serverTime: pos.serverTime,
        valid: pos.valid,
      });

      // Callback'leri çağır
      positionCallbacks.forEach((cb) => cb(positions.get(pos.deviceId)!));
    }
  }

  // Devices update
  if (data.devices) {
    for (const device of data.devices) {
      devices.set(device.id, {
        id: device.id,
        name: device.name,
        uniqueId: device.uniqueId,
        status: device.status,
      });
    }
  }

  // Events (geofence enter/exit, etc.)
  if (data.events) {
    for (const event of data.events) {
      eventCallbacks.forEach((cb) => cb(event));
    }
  }
}

/**
 * Konum güncellemesi callback'i ekler
 */
export function onPositionUpdate(callback: PositionCallback) {
  positionCallbacks.add(callback);
  return () => positionCallbacks.delete(callback);
}

/**
 * Event callback'i ekler
 */
export function onEvent(callback: EventCallback) {
  eventCallbacks.add(callback);
  return () => eventCallbacks.delete(callback);
}

/**
 * Belirli bir cihazın konumunu döndürür
 */
export function getPosition(deviceId: number): TraccarPosition | undefined {
  return positions.get(deviceId);
}

/**
 * Tüm konumları döndürür
 */
export function getAllPositions(): TraccarPosition[] {
  return Array.from(positions.values());
}

/**
 * Store state'ini export et
 */
export const traccarStore = {
  get connected() {
    return connected;
  },
  get lastUpdate() {
    return lastUpdate;
  },
  get error() {
    return error;
  },
  get positions() {
    return positions;
  },
  get devices() {
    return devices;
  },
  connect,
  disconnect,
  onPositionUpdate,
  onEvent,
  getPosition,
  getAllPositions,
};
