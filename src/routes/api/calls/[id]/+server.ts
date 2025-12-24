// ============================================
// CALL BY ID API - Tekil Çağrı İşlemleri (Drizzle)
// GET: Çağrı detayı
// PATCH: Çağrı güncelle (ata, tamamla, iptal)
// DELETE: Çağrı sil
// ============================================

import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import * as db from "$lib/server/db";

// GET - Çağrı detayı
export const GET: RequestHandler = async ({ params }) => {
  try {
    const id = parseInt(params.id);

    if (isNaN(id)) {
      return error(400, "Geçersiz çağrı ID");
    }

    const call = await db.getCallById(id);

    if (!call) {
      return error(404, "Çağrı bulunamadı");
    }

    return json({
      success: true,
      data: call,
    });
  } catch (err) {
    console.error("Call GET error:", err);
    return error(500, "Çağrı getirilirken hata oluştu");
  }
};

// PATCH - Çağrı güncelle
export const PATCH: RequestHandler = async ({ params, request }) => {
  try {
    const id = parseInt(params.id);

    if (isNaN(id)) {
      return error(400, "Geçersiz çağrı ID");
    }

    const body = await request.json();
    const { action, vehicleId, reason } = body;

    // Çağrı var mı kontrol et
    const existingCall = await db.getCallById(id);

    if (!existingCall) {
      return error(404, "Çağrı bulunamadı");
    }

    // Action'a göre işlem yap
    switch (action) {
      case "assign": {
        if (!vehicleId) {
          return error(400, "vehicleId zorunludur");
        }

        if (existingCall.status !== "pending") {
          return error(400, "Sadece bekleyen çağrılar atanabilir");
        }

        // Araç müsait mi kontrol et
        const vehicle = await db.getVehicleById(vehicleId);

        if (!vehicle) {
          return error(404, "Araç bulunamadı");
        }

        if (vehicle.status !== "available") {
          return error(400, "Araç müsait değil");
        }

        // Çağrıyı ata
        const assignedCall = await db.assignCall(id, vehicleId);

        // Aracı meşgul yap
        await db.updateVehicleStatus(vehicleId, "busy");

        // Görev oluştur
        await db.createTask({
          vehicleId,
          callId: id,
          pickupStopId: existingCall.stopId,
        });

        return json({
          success: true,
          data: assignedCall,
          message: "Çağrı araca atandı",
        });
      }

      case "complete": {
        if (existingCall.status !== "assigned") {
          return error(400, "Sadece atanmış çağrılar tamamlanabilir");
        }

        const completedCall = await db.completeCall(id);

        // İstatistikleri güncelle
        await db.incrementCompletedCallCount();
        await db.updateAverageWaitTime();

        return json({
          success: true,
          data: completedCall,
          message: "Çağrı tamamlandı",
        });
      }

      case "cancel": {
        if (
          existingCall.status === "completed" ||
          existingCall.status === "cancelled"
        ) {
          return error(400, "Bu çağrı zaten tamamlanmış veya iptal edilmiş");
        }

        const cancelledCall = await db.cancelCall(id, reason);

        // İstatistikleri güncelle
        await db.incrementCancelledCallCount();

        return json({
          success: true,
          data: cancelledCall,
          message: "Çağrı iptal edildi",
        });
      }

      default:
        return error(
          400,
          "Geçersiz action. Kullanılabilir: assign, complete, cancel"
        );
    }
  } catch (err) {
    console.error("Call PATCH error:", err);
    return error(500, "Çağrı güncellenirken hata oluştu");
  }
};

// DELETE - Çağrı sil (sadece pending durumundakiler)
export const DELETE: RequestHandler = async ({ params }) => {
  try {
    const id = parseInt(params.id);

    if (isNaN(id)) {
      return error(400, "Geçersiz çağrı ID");
    }

    const call = await db.getCallById(id);

    if (!call) {
      return error(404, "Çağrı bulunamadı");
    }

    if (call.status !== "pending") {
      return error(400, "Sadece bekleyen çağrılar silinebilir");
    }

    // İptal olarak işaretle (soft delete)
    const cancelledCall = await db.cancelCall(id, "Silindi");

    return json({
      success: true,
      data: cancelledCall,
      message: "Çağrı silindi",
    });
  } catch (err) {
    console.error("Call DELETE error:", err);
    return error(500, "Çağrı silinirken hata oluştu");
  }
};
