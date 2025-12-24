// ============================================
// TASKS API - Görev Yönetimi (Drizzle)
// GET: Tüm görevleri listele
// POST: Yeni görev oluştur
// ============================================

import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import * as db from "$lib/server/db";

type TaskStatus = "assigned" | "pickup" | "dropoff" | "completed" | "cancelled";

// GET - Tüm görevleri listele
export const GET: RequestHandler = async ({ url }) => {
  try {
    const status = url.searchParams.get("status") as TaskStatus | null;
    const vehicleId = url.searchParams.get("vehicleId");
    const limit = parseInt(url.searchParams.get("limit") ?? "50");
    const offset = parseInt(url.searchParams.get("offset") ?? "0");
    const activeOnly = url.searchParams.get("active") === "true";

    // Sadece aktif görevler isteniyorsa
    if (activeOnly) {
      const tasks = await db.getActiveTasks();
      return json({
        success: true,
        data: tasks,
        count: tasks.length,
      });
    }

    const { tasks, total } = await db.getAllTasks({
      status: status ?? undefined,
      vehicleId: vehicleId ? parseInt(vehicleId) : undefined,
      limit,
      offset,
    });

    return json({
      success: true,
      data: tasks,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (err) {
    console.error("Tasks GET error:", err);
    return error(500, "Görevler getirilirken hata oluştu");
  }
};

// POST - Yeni görev oluştur
export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();

    // Validasyon
    if (!body.vehicleId || !body.callId || !body.pickupStopId) {
      return error(400, "vehicleId, callId ve pickupStopId zorunludur");
    }

    const vehicleId = parseInt(body.vehicleId);
    const callId = parseInt(body.callId);
    const pickupStopId = parseInt(body.pickupStopId);
    const dropoffStopId = body.dropoffStopId
      ? parseInt(body.dropoffStopId)
      : undefined;

    // Araç var mı ve müsait mi kontrol et
    const vehicle = await db.getVehicleById(vehicleId);

    if (!vehicle) {
      return error(404, "Araç bulunamadı");
    }

    if (vehicle.status !== "available") {
      return error(400, "Araç müsait değil");
    }

    // Çağrı var mı kontrol et
    const call = await db.getCallById(callId);

    if (!call) {
      return error(404, "Çağrı bulunamadı");
    }

    // Çağrı zaten atanmış mı kontrol et
    if (call.status !== "pending") {
      return error(400, "Bu çağrı zaten atanmış veya tamamlanmış");
    }

    // Bu çağrı için zaten aktif task var mı kontrol et
    const existingTask = await db.getActiveTaskByCallId(callId);
    if (existingTask) {
      return error(400, "Bu çağrı için zaten aktif bir görev var");
    }

    // Görev oluştur
    const task = await db.createTask({
      vehicleId,
      callId,
      pickupStopId,
      dropoffStopId,
    });

    // Aracı meşgul yap
    await db.updateVehicleStatus(vehicleId, "busy");

    // Çağrıyı ata
    await db.assignCall(callId, vehicleId);

    return json(
      {
        success: true,
        data: task,
        message: "Görev oluşturuldu",
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Task POST error:", err);
    return error(500, "Görev oluşturulurken hata oluştu");
  }
};
