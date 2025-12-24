// ============================================
// CALLS API - Çağrı Yönetimi (Drizzle)
// GET: Tüm çağrıları listele
// POST: Yeni çağrı oluştur
// ============================================

import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import * as db from "$lib/server/db";

type CallStatus = "pending" | "assigned" | "completed" | "cancelled";

// GET - Tüm çağrıları listele
export const GET: RequestHandler = async ({ url }) => {
  try {
    const status = url.searchParams.get("status") as CallStatus | null;
    const limit = parseInt(url.searchParams.get("limit") ?? "50");
    const offset = parseInt(url.searchParams.get("offset") ?? "0");
    const activeOnly = url.searchParams.get("active") === "true";

    // Sadece aktif çağrılar isteniyorsa
    if (activeOnly) {
      const calls = await db.getActiveCalls();
      return json({
        success: true,
        data: calls,
        count: calls.length,
      });
    }

    const { calls, total } = await db.getAllCalls({
      status: status ?? undefined,
      limit,
      offset,
    });

    return json({
      success: true,
      data: calls,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (err) {
    console.error("Calls GET error:", err);
    return error(500, "Çağrılar getirilirken hata oluştu");
  }
};

// POST - Yeni çağrı oluştur
export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();

    // Validasyon
    if (!body.stopId) {
      return error(400, "stopId zorunludur");
    }

    const stopId = parseInt(body.stopId);

    if (isNaN(stopId)) {
      return error(400, "Geçersiz stopId");
    }

    // Durak var mı kontrol et
    const stop = await db.getStopById(stopId);

    if (!stop) {
      return error(404, "Durak bulunamadı");
    }

    // Çağrı oluştur
    const call = await db.createCall(stopId);

    // İstatistikleri güncelle
    await db.incrementCallCount();

    return json(
      {
        success: true,
        data: call,
        message: "Çağrı oluşturuldu",
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error("Call POST error:", err);

    if (err instanceof Error && err.message.includes("zaten bekleyen")) {
      return error(409, err.message);
    }

    return error(500, "Çağrı oluşturulurken hata oluştu");
  }
};
