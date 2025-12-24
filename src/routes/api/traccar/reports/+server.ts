/**
 * Traccar Reports API
 *
 * GET /api/traccar/reports?type=trips|stops|summary|route|events
 *     &deviceId=7&from=2025-12-24T00:00:00Z&to=2025-12-24T23:59:59Z
 *
 * Traccar'dan rapor verilerini çeker
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import {
  getTripsReport,
  getStopsReport,
  getSummaryReport,
  getRouteReport,
  getEventsReport,
  getDevices,
  knotsToKmh,
  metersToKm,
  msToHMS,
} from "$lib/server/traccar";
import { db } from "$lib/server/db";
import * as schema from "$lib/server/db/schema";

export const GET: RequestHandler = async ({ url }) => {
  try {
    const type = url.searchParams.get("type") || "summary";
    const deviceIdParam = url.searchParams.get("deviceId");
    const fromParam = url.searchParams.get("from");
    const toParam = url.searchParams.get("to");

    // Tarih parametreleri zorunlu
    if (!fromParam || !toParam) {
      return json({
        success: false,
        message: "from ve to parametreleri zorunludur",
      });
    }

    const from = new Date(fromParam);
    const to = new Date(toParam);

    // Device ID yoksa tüm eşleştirilmiş araçları al
    let deviceIds: number[] = [];
    if (deviceIdParam) {
      deviceIds = deviceIdParam.split(",").map((id) => parseInt(id));
    } else {
      // Veritabanından eşleştirilmiş araçları al
      const vehicles = await db.select().from(schema.vehicles);
      deviceIds = vehicles
        .filter((v) => v.traccarId)
        .map((v) => v.traccarId as number);
    }

    if (deviceIds.length === 0) {
      return json({
        success: true,
        data: [],
        message: "Eşleştirilmiş cihaz bulunamadı",
      });
    }

    // Cihaz bilgilerini al (isim eşleştirmesi için)
    const devices = await getDevices();
    const deviceMap = new Map(devices.map((d) => [d.id, d]));

    // Araç bilgilerini al
    const vehicles = await db.select().from(schema.vehicles);
    const vehicleByTraccarId = new Map(
      vehicles.filter((v) => v.traccarId).map((v) => [v.traccarId, v])
    );

    let result: any[] = [];

    switch (type) {
      case "trips": {
        for (const deviceId of deviceIds) {
          const trips = await getTripsReport(deviceId, from, to);
          const device = deviceMap.get(deviceId);
          const vehicle = vehicleByTraccarId.get(deviceId);

          result.push(
            ...trips.map((trip) => ({
              ...trip,
              deviceName: device?.name || `Device ${deviceId}`,
              vehicleName: vehicle?.name || device?.name,
              vehicleId: vehicle?.id,
              // Dönüştürülmüş değerler
              maxSpeedKmh: knotsToKmh(trip.maxSpeed).toFixed(1),
              averageSpeedKmh: knotsToKmh(trip.averageSpeed).toFixed(1),
              distanceKm: metersToKm(trip.distance).toFixed(2),
              durationFormatted: msToHMS(trip.duration),
            }))
          );
        }
        break;
      }

      case "stops": {
        for (const deviceId of deviceIds) {
          const stops = await getStopsReport(deviceId, from, to);
          const device = deviceMap.get(deviceId);
          const vehicle = vehicleByTraccarId.get(deviceId);

          result.push(
            ...stops.map((stop) => ({
              ...stop,
              deviceName: device?.name || `Device ${deviceId}`,
              vehicleName: vehicle?.name || device?.name,
              vehicleId: vehicle?.id,
              durationFormatted: msToHMS(stop.duration),
            }))
          );
        }
        break;
      }

      case "summary": {
        for (const deviceId of deviceIds) {
          const summaries = await getSummaryReport(deviceId, from, to);
          const device = deviceMap.get(deviceId);
          const vehicle = vehicleByTraccarId.get(deviceId);

          result.push(
            ...summaries.map((summary) => ({
              ...summary,
              deviceName: device?.name || `Device ${deviceId}`,
              vehicleName: vehicle?.name || device?.name,
              vehicleId: vehicle?.id,
              maxSpeedKmh: knotsToKmh(summary.maxSpeed).toFixed(1),
              averageSpeedKmh: knotsToKmh(summary.averageSpeed).toFixed(1),
              distanceKm: metersToKm(summary.distance).toFixed(2),
              engineHoursFormatted: msToHMS(summary.engineHours),
            }))
          );
        }
        break;
      }

      case "route": {
        for (const deviceId of deviceIds) {
          const positions = await getRouteReport(deviceId, from, to);
          const device = deviceMap.get(deviceId);
          const vehicle = vehicleByTraccarId.get(deviceId);

          result.push(
            ...positions.map((pos) => ({
              ...pos,
              deviceName: device?.name || `Device ${deviceId}`,
              vehicleName: vehicle?.name || device?.name,
              vehicleId: vehicle?.id,
              speedKmh: knotsToKmh(pos.speed).toFixed(1),
            }))
          );
        }
        break;
      }

      case "events": {
        for (const deviceId of deviceIds) {
          const events = await getEventsReport(deviceId, from, to);
          const device = deviceMap.get(deviceId);
          const vehicle = vehicleByTraccarId.get(deviceId);

          result.push(
            ...events.map((event) => ({
              ...event,
              deviceName: device?.name || `Device ${deviceId}`,
              vehicleName: vehicle?.name || device?.name,
              vehicleId: vehicle?.id,
            }))
          );
        }
        break;
      }

      default:
        return json({
          success: false,
          message: `Geçersiz rapor tipi: ${type}`,
        });
    }

    return json({
      success: true,
      data: result,
      meta: {
        type,
        from: from.toISOString(),
        to: to.toISOString(),
        deviceCount: deviceIds.length,
        recordCount: result.length,
      },
    });
  } catch (error) {
    console.error("Traccar reports error:", error);
    return json({
      success: false,
      message: "Rapor alınırken hata oluştu",
      error: String(error),
    });
  }
};
