// ============================================
// GEOFENCE CHECK API - Geofence Kontrolü (Database)
// POST: Araç konumunu kontrol et, geofence tetikle
// ============================================

import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import * as db from "$lib/server/db";
import { calculateDistance } from "$lib/utils/geo";

// POST - Geofence kontrolü
export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();

    // Validasyon
    if (!body.vehicleId || body.lat === undefined || body.lng === undefined) {
      return error(400, "vehicleId, lat ve lng zorunludur");
    }

    const vehicleId = parseInt(body.vehicleId);
    const lat = parseFloat(body.lat);
    const lng = parseFloat(body.lng);

    // Araç var mı kontrol et
    const vehicle = await db.getVehicleById(vehicleId);

    if (!vehicle) {
      return error(404, "Araç bulunamadı");
    }

    // Araç konumunu güncelle
    await db.updateVehiclePosition(
      vehicleId,
      lat,
      lng,
      body.speed ?? 0,
      body.heading ?? 0
    );

    // Araçın aktif görevi var mı?
    const activeTask = await db.getActiveTaskByVehicleId(vehicleId);

    if (!activeTask) {
      return json({
        success: true,
        data: {
          vehicleId,
          hasActiveTask: false,
          geofenceTriggered: false,
        },
      });
    }

    // Hedef durağı belirle (pickup veya dropoff)
    let targetStop = null;
    let targetType: "pickup" | "dropoff" = "pickup";

    if (activeTask.status === "assigned") {
      // Pickup durağına gidiyor
      targetStop = activeTask.pickupStop;
      targetType = "pickup";
    } else if (
      activeTask.status === "pickup" ||
      activeTask.status === "dropoff"
    ) {
      // Dropoff durağına gidiyor
      if (activeTask.dropoffStop) {
        targetStop = activeTask.dropoffStop;
        targetType = "dropoff";
      }
    }

    if (!targetStop) {
      return json({
        success: true,
        data: {
          vehicleId,
          taskId: activeTask.id,
          hasActiveTask: true,
          geofenceTriggered: false,
          message: "Hedef durak belirlenmemiş",
        },
      });
    }

    // Mesafeyi hesapla
    const distance = calculateDistance(
      { lat, lng },
      { lat: targetStop.lat, lng: targetStop.lng }
    );

    // Geofence kontrolü (varsayılan 15m)
    const geofenceRadius = 15; // metre
    const isInsideGeofence = distance <= geofenceRadius;

    // Geofence event kaydet
    if (isInsideGeofence) {
      // Son event'i kontrol et (tekrar tetiklemeyi önle)
      const lastEvent = await db.getLastGeofenceEvent(vehicleId, targetStop.id);
      const shouldTrigger =
        !lastEvent ||
        lastEvent.type === "exit" ||
        Date.now() - new Date(lastEvent.timestamp).getTime() > 60000; // 1 dakikadan eski

      if (shouldTrigger) {
        // Geofence enter event'i kaydet
        await db.createGeofenceEvent({
          vehicleId,
          stopId: targetStop.id,
          type: "enter",
          distance,
        });

        // Otomatik görev tamamlama
        if (targetType === "pickup" && activeTask.status === "assigned") {
          // Misafir alındı
          await db.pickupTask(activeTask.id);

          return json({
            success: true,
            data: {
              vehicleId,
              taskId: activeTask.id,
              hasActiveTask: true,
              geofenceTriggered: true,
              action: "pickup",
              stopId: targetStop.id,
              stopName: targetStop.name,
              distance: Math.round(distance),
              message: `Misafir ${targetStop.name} durağından alındı`,
            },
          });
        } else if (
          targetType === "dropoff" &&
          (activeTask.status === "pickup" || activeTask.status === "dropoff")
        ) {
          // Görev tamamlandı
          await db.completeTask(activeTask.id, true);
          await db.incrementCompletedCallCount();
          await db.updateAverageTripTime();

          return json({
            success: true,
            data: {
              vehicleId,
              taskId: activeTask.id,
              hasActiveTask: false,
              geofenceTriggered: true,
              action: "complete",
              stopId: targetStop.id,
              stopName: targetStop.name,
              distance: Math.round(distance),
              autoCompleted: true,
              message: `Görev otomatik tamamlandı - ${targetStop.name}`,
            },
          });
        }
      }
    }

    return json({
      success: true,
      data: {
        vehicleId,
        taskId: activeTask.id,
        hasActiveTask: true,
        geofenceTriggered: false,
        targetStop: {
          id: targetStop.id,
          name: targetStop.name,
        },
        distance: Math.round(distance),
        geofenceRadius,
        isInsideGeofence,
      },
    });
  } catch (err) {
    console.error("Geofence check error:", err);
    return error(500, "Geofence kontrolü sırasında hata oluştu");
  }
};
