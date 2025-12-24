/**
 * Traccar API Proxy Endpoint
 *
 * GET /api/traccar - Traccar bağlantı durumu ve cihaz listesi
 * GET /api/traccar?action=devices - Cihaz listesi
 * GET /api/traccar?action=positions - Konum listesi
 * GET /api/traccar?action=geofences - Geofence listesi
 * GET /api/traccar?action=groups - Grup listesi
 * GET /api/traccar?action=trips&deviceId=X&from=ISO&to=ISO - Seyahat raporu
 * GET /api/traccar?action=stops&deviceId=X&from=ISO&to=ISO - Durak raporu
 * GET /api/traccar?action=summary&deviceId=X&from=ISO&to=ISO - Özet rapor
 * GET /api/traccar?action=route&deviceId=X&from=ISO&to=ISO - Rota raporu
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import * as traccar from "$lib/server/traccar";

export const GET: RequestHandler = async ({ url }) => {
  const action = url.searchParams.get("action");
  const deviceId = url.searchParams.get("deviceId");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  try {
    switch (action) {
      case "status": {
        const status = await traccar.checkConnection();
        return json({ success: true, data: status });
      }

      case "devices": {
        const devices = await traccar.getDevices();
        return json({ success: true, data: devices });
      }

      case "positions": {
        const positions = await traccar.getPositions();
        return json({ success: true, data: positions });
      }

      case "geofences": {
        const geofences = await traccar.getGeofences();
        return json({ success: true, data: geofences });
      }

      case "groups": {
        const groups = await traccar.getGroups();
        return json({ success: true, data: groups });
      }

      case "full": {
        // Cihazlar ve konumları birlikte
        const devicesWithPositions = await traccar.getDevicesWithPositions();
        return json({ success: true, data: devicesWithPositions });
      }

      case "trips": {
        if (!deviceId || !from || !to) {
          return json(
            {
              success: false,
              message: "deviceId, from ve to parametreleri gerekli",
            },
            { status: 400 }
          );
        }
        const trips = await traccar.getTripsReport(
          parseInt(deviceId),
          new Date(from),
          new Date(to)
        );
        // km/h ve km'ye çevir
        const tripsConverted = trips.map((t) => ({
          ...t,
          maxSpeedKmh: traccar.knotsToKmh(t.maxSpeed),
          averageSpeedKmh: traccar.knotsToKmh(t.averageSpeed),
          distanceKm: traccar.metersToKm(t.distance),
          durationFormatted: traccar.secondsToHMS(t.duration),
        }));
        return json({ success: true, data: tripsConverted });
      }

      case "stops": {
        if (!deviceId || !from || !to) {
          return json(
            {
              success: false,
              message: "deviceId, from ve to parametreleri gerekli",
            },
            { status: 400 }
          );
        }
        const stops = await traccar.getStopsReport(
          parseInt(deviceId),
          new Date(from),
          new Date(to)
        );
        const stopsConverted = stops.map((s) => ({
          ...s,
          durationFormatted: traccar.secondsToHMS(s.duration),
        }));
        return json({ success: true, data: stopsConverted });
      }

      case "summary": {
        if (!deviceId || !from || !to) {
          return json(
            {
              success: false,
              message: "deviceId, from ve to parametreleri gerekli",
            },
            { status: 400 }
          );
        }
        const summary = await traccar.getSummaryReport(
          parseInt(deviceId),
          new Date(from),
          new Date(to)
        );
        const summaryConverted = summary.map((s) => ({
          ...s,
          maxSpeedKmh: traccar.knotsToKmh(s.maxSpeed),
          averageSpeedKmh: traccar.knotsToKmh(s.averageSpeed),
          distanceKm: traccar.metersToKm(s.distance),
        }));
        return json({ success: true, data: summaryConverted });
      }

      case "route": {
        if (!deviceId || !from || !to) {
          return json(
            {
              success: false,
              message: "deviceId, from ve to parametreleri gerekli",
            },
            { status: 400 }
          );
        }
        const route = await traccar.getRouteReport(
          parseInt(deviceId),
          new Date(from),
          new Date(to)
        );
        // Speed'i km/h'ye çevir
        const routeConverted = route.map((p) => ({
          ...p,
          speedKmh: traccar.knotsToKmh(p.speed),
        }));
        return json({ success: true, data: routeConverted });
      }

      case "history": {
        // Geçmiş konumlar (positions endpoint)
        if (!deviceId || !from || !to) {
          return json(
            {
              success: false,
              message: "deviceId, from ve to parametreleri gerekli",
            },
            { status: 400 }
          );
        }
        const history = await traccar.getHistoricalPositions(
          parseInt(deviceId),
          new Date(from),
          new Date(to)
        );
        const historyConverted = history.map((p) => ({
          ...p,
          speedKmh: traccar.knotsToKmh(p.speed),
        }));
        return json({ success: true, data: historyConverted });
      }

      case "server": {
        const serverInfo = await traccar.getServerInfo();
        return json({ success: true, data: serverInfo });
      }

      default: {
        // Varsayılan: bağlantı durumu + cihaz sayısı
        const [status, devices] = await Promise.all([
          traccar.checkConnection(),
          traccar.getDevices(),
        ]);
        return json({
          success: true,
          data: {
            ...status,
            deviceCount: devices.length,
            onlineCount: devices.filter((d) => d.status === "online").length,
          },
        });
      }
    }
  } catch (error) {
    console.error("Traccar API error:", error);
    return json({ success: false, message: String(error) }, { status: 500 });
  }
};
