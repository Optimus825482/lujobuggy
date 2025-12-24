// ============================================
// STATS STORE - İstatistikler (Svelte 5 Runes)
// ============================================

import type { DailyStats } from "$lib/types";

// Bugünün istatistikleri
const today = new Date().toISOString().split("T")[0];

const initialStats: DailyStats = {
  date: today,
  totalCalls: 47,
  completedCalls: 44,
  cancelledCalls: 2,
  averageWaitTime: 192, // 3.2 dakika
  averageTripTime: 240, // 4 dakika
  totalTrips: 44,
  busyVehicles: 1,
  availableVehicles: 2,
};

// Reactive state
let stats = $state<DailyStats>(initialStats);

// Actions
function incrementTotalCalls(): void {
  stats = { ...stats, totalCalls: stats.totalCalls + 1 };
}

function incrementCompletedCalls(): void {
  stats = {
    ...stats,
    completedCalls: stats.completedCalls + 1,
    totalTrips: stats.totalTrips + 1,
  };
}

function incrementCancelledCalls(): void {
  stats = { ...stats, cancelledCalls: stats.cancelledCalls + 1 };
}

function updateVehicleCounts(busy: number, available: number): void {
  stats = { ...stats, busyVehicles: busy, availableVehicles: available };
}

function updateAverageWaitTime(newWaitTime: number): void {
  // Kayan ortalama hesapla
  const totalCalls = stats.completedCalls + 1;
  const newAverage =
    (stats.averageWaitTime * stats.completedCalls + newWaitTime) / totalCalls;
  stats = { ...stats, averageWaitTime: Math.round(newAverage) };
}

function setStats(newStats: DailyStats): void {
  stats = newStats;
}

function resetDailyStats(): void {
  stats = {
    date: new Date().toISOString().split("T")[0],
    totalCalls: 0,
    completedCalls: 0,
    cancelledCalls: 0,
    averageWaitTime: 0,
    averageTripTime: 0,
    totalTrips: 0,
    busyVehicles: 0,
    availableVehicles: 0,
  };
}

// Export store
export const statsStore = {
  get stats() {
    return stats;
  },
  incrementTotalCalls,
  incrementCompletedCalls,
  incrementCancelledCalls,
  updateVehicleCounts,
  updateAverageWaitTime,
  set: setStats,
  reset: resetDailyStats,
};
