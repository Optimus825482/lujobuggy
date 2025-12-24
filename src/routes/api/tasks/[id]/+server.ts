// ============================================
// TASK BY ID API - Tekil Görev İşlemleri (Drizzle)
// GET: Görev detayı
// PATCH: Görev güncelle
// ============================================

import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import * as db from "$lib/server/db";

// GET - Görev detayı
export const GET: RequestHandler = async ({ params }) => {
  try {
    const id = parseInt(params.id);

    if (isNaN(id)) {
      return error(400, "Geçersiz görev ID");
    }

    const task = await db.getTaskById(id);

    if (!task) {
      return error(404, "Görev bulunamadı");
    }

    return json({ success: true, data: task });
  } catch (err) {
    console.error("Task GET error:", err);
    return error(500, "Görev getirilirken hata oluştu");
  }
};

// PATCH - Görev güncelle
export const PATCH: RequestHandler = async ({ params, request }) => {
  try {
    const id = parseInt(params.id);

    if (isNaN(id)) {
      return error(400, "Geçersiz görev ID");
    }

    const body = await request.json();
    const { action, dropoffStopId, autoCompleted } = body;

    const existingTask = await db.getTaskById(id);

    if (!existingTask) {
      return error(404, "Görev bulunamadı");
    }

    switch (action) {
      case "setDropoff": {
        if (!dropoffStopId) {
          return error(400, "dropoffStopId zorunludur");
        }

        const stop = await db.getStopById(parseInt(dropoffStopId));

        if (!stop) {
          return error(404, "Hedef durak bulunamadı");
        }

        const updatedTask = await db.setTaskDropoff(
          id,
          parseInt(dropoffStopId)
        );

        return json({
          success: true,
          data: updatedTask,
          message: "Hedef durak belirlendi",
        });
      }

      case "pickup": {
        if (existingTask.status !== "assigned") {
          return error(400, "Sadece atanmış görevlerde pickup yapılabilir");
        }

        const updatedTask = await db.pickupTask(id);

        return json({
          success: true,
          data: updatedTask,
          message: "Misafir alındı",
        });
      }

      case "dropoff": {
        if (existingTask.status !== "pickup") {
          return error(400, "Önce misafir alınmalı");
        }

        if (!existingTask.dropoffStopId) {
          return error(400, "Önce hedef durak belirlenmeli");
        }

        const updatedTask = await db.dropoffTask(id);

        return json({
          success: true,
          data: updatedTask,
          message: "Misafir bırakıldı",
        });
      }

      case "complete": {
        if (
          existingTask.status === "completed" ||
          existingTask.status === "cancelled"
        ) {
          return error(400, "Bu görev zaten tamamlanmış veya iptal edilmiş");
        }

        const completedTask = await db.completeTask(id, autoCompleted ?? false);

        // İstatistikleri güncelle
        await db.incrementCompletedCallCount();
        await db.updateAverageTripTime();

        return json({
          success: true,
          data: completedTask,
          message: autoCompleted
            ? "Görev otomatik tamamlandı"
            : "Görev tamamlandı",
        });
      }

      case "cancel": {
        if (
          existingTask.status === "completed" ||
          existingTask.status === "cancelled"
        ) {
          return error(400, "Bu görev zaten tamamlanmış veya iptal edilmiş");
        }

        const cancelledTask = await db.cancelTask(id);

        // İstatistikleri güncelle
        await db.incrementCancelledCallCount();

        return json({
          success: true,
          data: cancelledTask,
          message: "Görev iptal edildi",
        });
      }

      default:
        return error(
          400,
          "Geçersiz action. Kullanılabilir: setDropoff, pickup, dropoff, complete, cancel"
        );
    }
  } catch (err) {
    console.error("Task PATCH error:", err);
    return error(500, "Görev güncellenirken hata oluştu");
  }
};
