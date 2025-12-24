/**
 * Traccar Server Info API
 *
 * GET /api/traccar/server - Sunucu bilgilerini ve istatistiklerini getirir
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { env } from "$env/dynamic/private";
import {
  getServerInfo,
  getDevices,
  getPositions,
  checkConnection,
} from "$lib/server/traccar";

const TRACCAR_URL = env.TRACCAR_URL || "https://traccar.optimistdemo.cloud";

export const GET: RequestHandler = async () => {
  try {
    // Bağlantı kontrolü
    const connection = await checkConnection();

    if (!connection.connected) {
      return json({
        success: false,
        message: "Traccar sunucusuna bağlanılamıyor",
        error: connection.error,
      });
    }

    // Sunucu bilgileri
    const serverInfo = await getServerInfo();

    // Cihaz ve konum bilgileri
    const [devices, positions] = await Promise.all([
      getDevices(),
      getPositions(),
    ]);

    // İstatistikler
    const onlineDevices = devices.filter((d) => d.status === "online");
    const offlineDevices = devices.filter((d) => d.status === "offline");
    const unknownDevices = devices.filter((d) => d.status === "unknown");

    // Son 24 saat içinde güncellenen cihazlar
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const activeDevices = devices.filter((d) => {
      if (!d.lastUpdate) return false;
      return new Date(d.lastUpdate) > last24h;
    });

    // Konum istatistikleri
    const validPositions = positions.filter((p) => p.valid);
    const avgSpeed =
      validPositions.length > 0
        ? validPositions.reduce((sum, p) => sum + p.speed, 0) /
          validPositions.length
        : 0;

    return json({
      success: true,
      data: {
        server: {
          url: TRACCAR_URL,
          version: serverInfo?.version || connection.version,
          registration: serverInfo?.registration,
          readonly: serverInfo?.readonly,
          deviceReadonly: serverInfo?.deviceReadonly,
          limitCommands: serverInfo?.limitCommands,
          map: serverInfo?.map,
          geocoderEnabled: (serverInfo as any)?.geocoderEnabled,
          emailEnabled: (serverInfo as any)?.emailEnabled,
          textEnabled: (serverInfo as any)?.textEnabled,
          latitude: serverInfo?.latitude,
          longitude: serverInfo?.longitude,
          zoom: serverInfo?.zoom,
        },
        statistics: {
          totalDevices: devices.length,
          onlineDevices: onlineDevices.length,
          offlineDevices: offlineDevices.length,
          unknownDevices: unknownDevices.length,
          activeDevices24h: activeDevices.length,
          totalPositions: positions.length,
          validPositions: validPositions.length,
          averageSpeedKnots: avgSpeed.toFixed(2),
          averageSpeedKmh: (avgSpeed * 1.852).toFixed(2),
        },
        devices: devices.map((d) => ({
          id: d.id,
          name: d.name,
          uniqueId: d.uniqueId,
          status: d.status,
          disabled: d.disabled,
          lastUpdate: d.lastUpdate,
          category: d.category,
          model: d.model,
        })),
        lastUpdate: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Traccar server info error:", error);
    return json({
      success: false,
      message: "Sunucu bilgileri alınırken hata oluştu",
      error: String(error),
    });
  }
};
