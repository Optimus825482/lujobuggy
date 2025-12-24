/**
 * Stop Visits API
 *
 * GET /api/stop-visits - Durak ziyaretlerini listele
 * GET /api/stop-visits?vehicleId=1 - Belirli aracın ziyaretleri
 * GET /api/stop-visits?stopId=1 - Belirli durağın ziyaretleri
 * GET /api/stop-visits?stats=true - Durak istatistikleri
 */

import type { RequestHandler } from "./$types";
import {
  getAllStopVisits,
  getVehicleStopVisits,
  getStopVisits,
  getStopStatistics,
  getVehicleStopStatistics,
} from "$lib/server/stop-visits";

export const GET: RequestHandler = async ({ url }) => {
  try {
    const vehicleId = url.searchParams.get("vehicleId");
    const stopId = url.searchParams.get("stopId");
    const stats = url.searchParams.get("stats");
    const fromStr = url.searchParams.get("from");
    const toStr = url.searchParams.get("to");
    const limitStr = url.searchParams.get("limit");

    // Tarih aralığı (varsayılan: son 7 gün)
    const to = toStr ? new Date(toStr) : new Date();
    const from = fromStr
      ? new Date(fromStr)
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const limit = limitStr ? parseInt(limitStr) : 100;

    // İstatistik modu
    if (stats === "true") {
      if (vehicleId) {
        const data = await getVehicleStopStatistics(
          parseInt(vehicleId),
          from,
          to
        );
        return Response.json({ success: true, data });
      }
      const data = await getStopStatistics(from, to);
      return Response.json({ success: true, data });
    }

    // Araç bazlı
    if (vehicleId) {
      const data = await getVehicleStopVisits(
        parseInt(vehicleId),
        from,
        to,
        limit
      );
      return Response.json({ success: true, data });
    }

    // Durak bazlı
    if (stopId) {
      const data = await getStopVisits(parseInt(stopId), from, to, limit);
      return Response.json({ success: true, data });
    }

    // Tüm ziyaretler
    const data = await getAllStopVisits(from, to, undefined, limit);
    return Response.json({ success: true, data });
  } catch (error) {
    console.error("[StopVisits API] Error:", error);
    return Response.json(
      { success: false, message: "Durak ziyaretleri alınamadı" },
      { status: 500 }
    );
  }
};
