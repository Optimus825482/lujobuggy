// ============================================
// BUGGY SHUTTLE SYSTEM - TYPE DEFINITIONS
// ============================================

// Koordinat tipi
export interface Coordinates {
  lat: number;
  lng: number;
}

// Durak tanımı
export interface Stop {
  id: number;
  name: string;
  lat: number;
  lng: number;
  icon: string;
  geofenceRadius: number; // metre cinsinden (varsayılan 15m)
}

// Araç durumları
export type VehicleStatus = "available" | "busy" | "offline" | "maintenance";

// Araç tanımı
export interface Vehicle {
  id: number;
  name: string;
  plateNumber: string;
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  status: VehicleStatus;
  currentTaskId: number | null;
  lastUpdate: Date;
  batteryLevel?: number;
  gpsSignal: boolean;
}

// Çağrı durumları
export type CallStatus = "pending" | "assigned" | "completed" | "cancelled";

// Çağrı tanımı
export interface Call {
  id: number;
  stopId: number;
  stopName: string;
  status: CallStatus;
  createdAt: Date;
  assignedVehicleId: number | null;
  assignedAt: Date | null;
  completedAt: Date | null;
}

// Görev durumları
export type TaskStatus =
  | "assigned"
  | "pickup"
  | "dropoff"
  | "completed"
  | "cancelled";

// Görev tanımı
export interface Task {
  id: number;
  vehicleId: number;
  callId: number;
  pickupStopId: number;
  dropoffStopId: number | null;
  status: TaskStatus;
  createdAt: Date;
  pickupAt: Date | null;
  dropoffAt: Date | null;
  completedAt: Date | null;
  autoCompleted: boolean; // Geofence ile otomatik tamamlandı mı
}

// Günlük istatistikler
export interface DailyStats {
  date: string;
  totalCalls: number;
  completedCalls: number;
  cancelledCalls: number;
  averageWaitTime: number; // saniye
  averageTripTime: number; // saniye
  totalTrips: number;
  busyVehicles: number;
  availableVehicles: number;
}

// WebSocket mesaj tipleri
export type WSMessageType =
  | "vehicle:update"
  | "call:new"
  | "call:assigned"
  | "call:completed"
  | "task:update"
  | "geofence:enter"
  | "geofence:exit"
  | "stats:update";

export interface WSMessage<T = unknown> {
  type: WSMessageType;
  payload: T;
  timestamp: Date;
}

// API Response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Geofence event
export interface GeofenceEvent {
  vehicleId: number;
  stopId: number;
  type: "enter" | "exit";
  timestamp: Date;
  distance: number;
}

// Traccar device
export interface TraccarDevice {
  id: number;
  name: string;
  uniqueId: string;
  status: string;
  lastUpdate: string;
  positionId: number;
}

// Traccar position
export interface TraccarPosition {
  id: number;
  deviceId: number;
  latitude: number;
  longitude: number;
  speed: number;
  course: number;
  altitude: number;
  accuracy: number;
  fixTime: string;
  deviceTime: string;
  serverTime: string;
  attributes: Record<string, unknown>;
}
