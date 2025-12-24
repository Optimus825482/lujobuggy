/**
 * Stop Visits Service
 *
 * Araçların duraklara giriş/çıkış kayıtlarını yönetir.
 * Traccar geofence eventlerinden tetiklenir.
 */

import { db } from "./db";
import * as schema from "./db/schema";
import { eq, and, isNull, desc, gte, lte } from "drizzle-orm";

/**
 * Araç durağa girdiğinde çağrılır
 */
export async function recordStopEnter(
  vehicleId: number,
  stopId: number
): Promise<number> {
  // Önce açık bir visit var mı kontrol et (çıkış yapılmamış)
  const openVisit = await db
    .select()
    .from(schema.stopVisits)
    .where(
      and(
        eq(schema.stopVisits.vehicleId, vehicleId),
        eq(schema.stopVisits.stopId, stopId),
        isNull(schema.stopVisits.exitTime)
      )
    )
    .limit(1);

  if (openVisit.length > 0) {
    // Zaten açık bir visit var, ID'sini döndür
    return openVisit[0].id;
  }

  // Yeni visit oluştur
  const [visit] = await db
    .insert(schema.stopVisits)
    .values({
      vehicleId,
      stopId,
      enterTime: new Date(),
    })
    .returning();

  console.log(
    `[StopVisit] Araç ${vehicleId} durağa ${stopId} girdi - Visit ID: ${visit.id}`
  );
  return visit.id;
}

/**
 * Araç duraktan çıktığında çağrılır
 */
export async function recordStopExit(
  vehicleId: number,
  stopId: number
): Promise<void> {
  // Açık visit'i bul
  const [openVisit] = await db
    .select()
    .from(schema.stopVisits)
    .where(
      and(
        eq(schema.stopVisits.vehicleId, vehicleId),
        eq(schema.stopVisits.stopId, stopId),
        isNull(schema.stopVisits.exitTime)
      )
    )
    .orderBy(desc(schema.stopVisits.enterTime))
    .limit(1);

  if (!openVisit) {
    console.log(
      `[StopVisit] Araç ${vehicleId} için açık visit bulunamadı (durak ${stopId})`
    );
    return;
  }

  // Süreyi hesapla (saniye)
  const exitTime = new Date();
  const duration = Math.round(
    (exitTime.getTime() - new Date(openVisit.enterTime).getTime()) / 1000
  );

  // Visit'i güncelle
  await db
    .update(schema.stopVisits)
    .set({
      exitTime,
      duration,
    })
    .where(eq(schema.stopVisits.id, openVisit.id));

  console.log(
    `[StopVisit] Araç ${vehicleId} duraktan ${stopId} çıktı - Süre: ${duration}s`
  );
}

/**
 * Belirli bir aracın durak ziyaretlerini getirir
 */
export async function getVehicleStopVisits(
  vehicleId: number,
  from?: Date,
  to?: Date,
  limit = 100
): Promise<StopVisitWithDetails[]> {
  let query = db
    .select({
      visit: schema.stopVisits,
      stop: schema.stops,
      vehicle: schema.vehicles,
    })
    .from(schema.stopVisits)
    .innerJoin(schema.stops, eq(schema.stopVisits.stopId, schema.stops.id))
    .innerJoin(
      schema.vehicles,
      eq(schema.stopVisits.vehicleId, schema.vehicles.id)
    )
    .where(eq(schema.stopVisits.vehicleId, vehicleId))
    .orderBy(desc(schema.stopVisits.enterTime))
    .limit(limit);

  const results = await query;

  return results
    .filter((r) => {
      if (from && new Date(r.visit.enterTime) < from) return false;
      if (to && new Date(r.visit.enterTime) > to) return false;
      return true;
    })
    .map((r) => ({
      id: r.visit.id,
      vehicleId: r.visit.vehicleId,
      vehicleName: r.vehicle.name,
      vehiclePlate: r.vehicle.plateNumber,
      stopId: r.visit.stopId,
      stopName: r.stop.name,
      stopIcon: r.stop.icon,
      enterTime: r.visit.enterTime,
      exitTime: r.visit.exitTime,
      duration: r.visit.duration,
    }));
}

/**
 * Belirli bir durağın ziyaretlerini getirir
 */
export async function getStopVisits(
  stopId: number,
  from?: Date,
  to?: Date,
  limit = 100
): Promise<StopVisitWithDetails[]> {
  const results = await db
    .select({
      visit: schema.stopVisits,
      stop: schema.stops,
      vehicle: schema.vehicles,
    })
    .from(schema.stopVisits)
    .innerJoin(schema.stops, eq(schema.stopVisits.stopId, schema.stops.id))
    .innerJoin(
      schema.vehicles,
      eq(schema.stopVisits.vehicleId, schema.vehicles.id)
    )
    .where(eq(schema.stopVisits.stopId, stopId))
    .orderBy(desc(schema.stopVisits.enterTime))
    .limit(limit);

  return results
    .filter((r) => {
      if (from && new Date(r.visit.enterTime) < from) return false;
      if (to && new Date(r.visit.enterTime) > to) return false;
      return true;
    })
    .map((r) => ({
      id: r.visit.id,
      vehicleId: r.visit.vehicleId,
      vehicleName: r.vehicle.name,
      vehiclePlate: r.vehicle.plateNumber,
      stopId: r.visit.stopId,
      stopName: r.stop.name,
      stopIcon: r.stop.icon,
      enterTime: r.visit.enterTime,
      exitTime: r.visit.exitTime,
      duration: r.visit.duration,
    }));
}

/**
 * Tüm durak ziyaretlerini getirir (tarih aralığına göre)
 */
export async function getAllStopVisits(
  from: Date,
  to: Date,
  vehicleId?: number,
  limit = 500
): Promise<StopVisitWithDetails[]> {
  let whereClause = and(
    gte(schema.stopVisits.enterTime, from),
    lte(schema.stopVisits.enterTime, to)
  );

  if (vehicleId) {
    whereClause = and(whereClause, eq(schema.stopVisits.vehicleId, vehicleId));
  }

  const results = await db
    .select({
      visit: schema.stopVisits,
      stop: schema.stops,
      vehicle: schema.vehicles,
    })
    .from(schema.stopVisits)
    .innerJoin(schema.stops, eq(schema.stopVisits.stopId, schema.stops.id))
    .innerJoin(
      schema.vehicles,
      eq(schema.stopVisits.vehicleId, schema.vehicles.id)
    )
    .where(whereClause)
    .orderBy(desc(schema.stopVisits.enterTime))
    .limit(limit);

  return results.map((r) => ({
    id: r.visit.id,
    vehicleId: r.visit.vehicleId,
    vehicleName: r.vehicle.name,
    vehiclePlate: r.vehicle.plateNumber,
    stopId: r.visit.stopId,
    stopName: r.stop.name,
    stopIcon: r.stop.icon,
    enterTime: r.visit.enterTime,
    exitTime: r.visit.exitTime,
    duration: r.visit.duration,
  }));
}

/**
 * Durak bazlı istatistikler
 */
export async function getStopStatistics(
  from: Date,
  to: Date
): Promise<StopStatistics[]> {
  const visits = await getAllStopVisits(from, to, undefined, 10000);

  // Durak bazlı gruplama
  const stopStats = new Map<
    number,
    {
      stopId: number;
      stopName: string;
      stopIcon: string;
      visitCount: number;
      totalDuration: number;
      vehicles: Set<number>;
    }
  >();

  for (const visit of visits) {
    if (!stopStats.has(visit.stopId)) {
      stopStats.set(visit.stopId, {
        stopId: visit.stopId,
        stopName: visit.stopName,
        stopIcon: visit.stopIcon,
        visitCount: 0,
        totalDuration: 0,
        vehicles: new Set(),
      });
    }

    const stat = stopStats.get(visit.stopId)!;
    stat.visitCount++;
    stat.totalDuration += visit.duration || 0;
    stat.vehicles.add(visit.vehicleId);
  }

  return Array.from(stopStats.values())
    .map((s) => ({
      stopId: s.stopId,
      stopName: s.stopName,
      stopIcon: s.stopIcon,
      visitCount: s.visitCount,
      uniqueVehicles: s.vehicles.size,
      totalDuration: s.totalDuration,
      avgDuration:
        s.visitCount > 0 ? Math.round(s.totalDuration / s.visitCount) : 0,
    }))
    .sort((a, b) => b.visitCount - a.visitCount);
}

/**
 * Araç bazlı durak istatistikleri
 */
export async function getVehicleStopStatistics(
  vehicleId: number,
  from: Date,
  to: Date
): Promise<VehicleStopStatistics[]> {
  const visits = await getVehicleStopVisits(vehicleId, from, to, 10000);

  // Durak bazlı gruplama
  const stopStats = new Map<
    number,
    {
      stopId: number;
      stopName: string;
      stopIcon: string;
      visitCount: number;
      totalDuration: number;
      lastVisit: Date | null;
    }
  >();

  for (const visit of visits) {
    if (!stopStats.has(visit.stopId)) {
      stopStats.set(visit.stopId, {
        stopId: visit.stopId,
        stopName: visit.stopName,
        stopIcon: visit.stopIcon,
        visitCount: 0,
        totalDuration: 0,
        lastVisit: null,
      });
    }

    const stat = stopStats.get(visit.stopId)!;
    stat.visitCount++;
    stat.totalDuration += visit.duration || 0;
    if (!stat.lastVisit || new Date(visit.enterTime) > stat.lastVisit) {
      stat.lastVisit = new Date(visit.enterTime);
    }
  }

  return Array.from(stopStats.values())
    .map((s) => ({
      stopId: s.stopId,
      stopName: s.stopName,
      stopIcon: s.stopIcon,
      visitCount: s.visitCount,
      totalDuration: s.totalDuration,
      avgDuration:
        s.visitCount > 0 ? Math.round(s.totalDuration / s.visitCount) : 0,
      lastVisit: s.lastVisit,
    }))
    .sort((a, b) => b.visitCount - a.visitCount);
}

// Types
export interface StopVisitWithDetails {
  id: number;
  vehicleId: number;
  vehicleName: string;
  vehiclePlate: string;
  stopId: number;
  stopName: string;
  stopIcon: string;
  enterTime: Date;
  exitTime: Date | null;
  duration: number | null;
}

export interface StopStatistics {
  stopId: number;
  stopName: string;
  stopIcon: string;
  visitCount: number;
  uniqueVehicles: number;
  totalDuration: number;
  avgDuration: number;
}

export interface VehicleStopStatistics {
  stopId: number;
  stopName: string;
  stopIcon: string;
  visitCount: number;
  totalDuration: number;
  avgDuration: number;
  lastVisit: Date | null;
}
