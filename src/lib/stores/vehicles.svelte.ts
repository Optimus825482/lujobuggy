// ============================================
// VEHICLES STORE - Svelte 5 Runes
// ============================================

import type { Vehicle, VehicleStatus } from "$lib/types";

// Demo araçlar
const initialVehicles: Vehicle[] = [
  {
    id: 1,
    name: "Buggy-01",
    plateNumber: "48 ABC 001",
    lat: 37.1385641,
    lng: 27.5607023,
    speed: 0,
    heading: 0,
    status: "available",
    currentTaskId: null,
    lastUpdate: new Date(),
    batteryLevel: 85,
    gpsSignal: true,
  },
  {
    id: 2,
    name: "Buggy-02",
    plateNumber: "48 ABC 002",
    lat: 37.1381318,
    lng: 27.5594036,
    speed: 12,
    heading: 180,
    status: "busy",
    currentTaskId: 1,
    lastUpdate: new Date(),
    batteryLevel: 72,
    gpsSignal: true,
  },
  {
    id: 3,
    name: "Buggy-03",
    plateNumber: "48 ABC 003",
    lat: 37.136111,
    lng: 27.5600795,
    speed: 8,
    heading: 45,
    status: "available",
    currentTaskId: null,
    lastUpdate: new Date(),
    batteryLevel: 91,
    gpsSignal: true,
  },
  {
    id: 4,
    name: "Buggy-04",
    plateNumber: "48 ABC 004",
    lat: 37.1383483,
    lng: 27.5570835,
    speed: 0,
    heading: 0,
    status: "offline",
    currentTaskId: null,
    lastUpdate: new Date(Date.now() - 300000), // 5 dakika önce
    batteryLevel: 15,
    gpsSignal: false,
  },
];

// Reactive state with Svelte 5 runes
let vehicles = $state<Vehicle[]>(initialVehicles);

// Derived values
function getAvailableVehicles(): Vehicle[] {
  return vehicles.filter((v) => v.status === "available");
}

function getBusyVehicles(): Vehicle[] {
  return vehicles.filter((v) => v.status === "busy");
}

function getOfflineVehicles(): Vehicle[] {
  return vehicles.filter((v) => v.status === "offline");
}

function getVehicleById(id: number): Vehicle | undefined {
  return vehicles.find((v) => v.id === id);
}

// Actions
function updateVehiclePosition(
  id: number,
  lat: number,
  lng: number,
  speed: number,
  heading: number
): void {
  const index = vehicles.findIndex((v) => v.id === id);
  if (index !== -1) {
    vehicles[index] = {
      ...vehicles[index],
      lat,
      lng,
      speed,
      heading,
      lastUpdate: new Date(),
      gpsSignal: true,
    };
  }
}

function updateVehicleStatus(
  id: number,
  status: VehicleStatus,
  taskId?: number | null
): void {
  const index = vehicles.findIndex((v) => v.id === id);
  if (index !== -1) {
    vehicles[index] = {
      ...vehicles[index],
      status,
      currentTaskId: taskId ?? vehicles[index].currentTaskId,
    };
  }
}

function setVehicles(newVehicles: Vehicle[]): void {
  vehicles = newVehicles;
}

// Export store
export const vehiclesStore = {
  get vehicles() {
    return vehicles;
  },
  get available() {
    return getAvailableVehicles();
  },
  get busy() {
    return getBusyVehicles();
  },
  get offline() {
    return getOfflineVehicles();
  },
  getById: getVehicleById,
  updatePosition: updateVehiclePosition,
  updateStatus: updateVehicleStatus,
  set: setVehicles,
};
