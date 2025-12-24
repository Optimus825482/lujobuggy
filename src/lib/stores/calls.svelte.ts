// ============================================
// CALLS STORE - Çağrı Yönetimi (Svelte 5 Runes)
// ============================================

import type { Call, CallStatus } from "$lib/types";
import { STOPS } from "$lib/config/lujo";

// Demo çağrılar
const initialCalls: Call[] = [
  {
    id: 1,
    stopId: 3,
    stopName: "Havuz 1",
    status: "pending",
    createdAt: new Date(Date.now() - 120000), // 2 dakika önce
    assignedVehicleId: null,
    assignedAt: null,
    completedAt: null,
  },
  {
    id: 2,
    stopId: 7,
    stopName: "Villa 1",
    status: "assigned",
    createdAt: new Date(Date.now() - 300000), // 5 dakika önce
    assignedVehicleId: 2,
    assignedAt: new Date(Date.now() - 240000),
    completedAt: null,
  },
  {
    id: 3,
    stopId: 16,
    stopName: "Beach Club",
    status: "pending",
    createdAt: new Date(Date.now() - 60000), // 1 dakika önce
    assignedVehicleId: null,
    assignedAt: null,
    completedAt: null,
  },
];

// Reactive state
let calls = $state<Call[]>(initialCalls);
let nextCallId = $state(4);

// Derived values
function getPendingCalls(): Call[] {
  return calls.filter((c) => c.status === "pending");
}

function getAssignedCalls(): Call[] {
  return calls.filter((c) => c.status === "assigned");
}

function getActiveCalls(): Call[] {
  return calls.filter((c) => c.status === "pending" || c.status === "assigned");
}

function getCallById(id: number): Call | undefined {
  return calls.find((c) => c.id === id);
}

// Actions
function createCall(stopId: number): Call {
  const stop = STOPS.find((s) => s.id === stopId);
  const newCall: Call = {
    id: nextCallId++,
    stopId,
    stopName: stop?.name ?? `Durak ${stopId}`,
    status: "pending",
    createdAt: new Date(),
    assignedVehicleId: null,
    assignedAt: null,
    completedAt: null,
  };
  calls = [...calls, newCall];
  return newCall;
}

function assignCall(callId: number, vehicleId: number): void {
  const index = calls.findIndex((c) => c.id === callId);
  if (index !== -1) {
    calls[index] = {
      ...calls[index],
      status: "assigned",
      assignedVehicleId: vehicleId,
      assignedAt: new Date(),
    };
  }
}

function completeCall(callId: number): void {
  const index = calls.findIndex((c) => c.id === callId);
  if (index !== -1) {
    calls[index] = {
      ...calls[index],
      status: "completed",
      completedAt: new Date(),
    };
  }
}

function cancelCall(callId: number): void {
  const index = calls.findIndex((c) => c.id === callId);
  if (index !== -1) {
    calls[index] = {
      ...calls[index],
      status: "cancelled",
      completedAt: new Date(),
    };
  }
}

function setCalls(newCalls: Call[]): void {
  calls = newCalls;
}

// Export store
export const callsStore = {
  get calls() {
    return calls;
  },
  get pending() {
    return getPendingCalls();
  },
  get assigned() {
    return getAssignedCalls();
  },
  get active() {
    return getActiveCalls();
  },
  getById: getCallById,
  create: createCall,
  assign: assignCall,
  complete: completeCall,
  cancel: cancelCall,
  set: setCalls,
};
