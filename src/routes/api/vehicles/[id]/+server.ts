// ============================================
// VEHICLE BY ID API - Tekil Araç İşlemleri (Drizzle)
// GET: Araç detayı
// PATCH: Araç güncelle
// DELETE: Araç sil
// ============================================

import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import * as db from "$lib/server/db";

type VehicleStatus = "available" | "busy" | "offline" | "maintenance";

// GET - Araç detayı
export const GET: RequestHandler = async ({ params }) => {
  try {
    const id = parseInt(params.id);

    if (isNaN(id)) {
      return error(400, "Geçersiz araç ID");
    }

    const vehicle = await db.getVehicleById(id);

    if (!vehicle) {
      return error(404, "Araç bulunamadı");
    }

    return json({
      success: true,
      data: vehicle,
    });
  } catch (err) {
    console.error("Vehicle GET error:", err);
    return error(500, "Araç getirilirken hata oluştu");
  }
};

// PATCH - Araç güncelle
export const PATCH: RequestHandler = async ({ params, request }) => {
  try {
    const id = parseInt(params.id);

    if (isNaN(id)) {
      return error(400, "Geçersiz araç ID");
    }

    const body = await request.json();

    // Konum güncellemesi mi?
    if (body.lat !== undefined && body.lng !== undefined) {
      const vehicle = await db.updateVehiclePosition(
        id,
        body.lat,
        body.lng,
        body.speed ?? 0,
        body.heading ?? 0
      );

      if (!vehicle) {
        return error(404, "Araç bulunamadı");
      }

      return json({
        success: true,
        data: vehicle,
        message: "Araç konumu güncellendi",
      });
    }

    // Durum güncellemesi mi?
    if (body.status) {
      const validStatuses: VehicleStatus[] = [
        "available",
        "busy",
        "offline",
        "maintenance",
      ];

      if (!validStatuses.includes(body.status)) {
        return error(400, "Geçersiz durum değeri");
      }

      const vehicle = await db.updateVehicleStatus(id, body.status);

      if (!vehicle) {
        return error(404, "Araç bulunamadı");
      }

      return json({
        success: true,
        data: vehicle,
        message: "Araç durumu güncellendi",
      });
    }

    // Genel güncelleme
    const vehicle = await db.updateVehicle(id, body);

    if (!vehicle) {
      return error(404, "Araç bulunamadı");
    }

    return json({
      success: true,
      data: vehicle,
      message: "Araç güncellendi",
    });
  } catch (err) {
    console.error("Vehicle PATCH error:", err);
    return error(500, "Araç güncellenirken hata oluştu");
  }
};

// DELETE - Araç sil
export const DELETE: RequestHandler = async ({ params }) => {
  try {
    const id = parseInt(params.id);

    if (isNaN(id)) {
      return error(400, "Geçersiz araç ID");
    }

    const vehicle = await db.deleteVehicle(id);

    if (!vehicle) {
      return error(404, "Araç bulunamadı");
    }

    return json({
      success: true,
      data: vehicle,
      message: "Araç silindi",
    });
  } catch (err) {
    console.error("Vehicle DELETE error:", err);
    return error(500, "Araç silinirken hata oluştu");
  }
};
