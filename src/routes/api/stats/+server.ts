// ============================================
// STATS API - İstatistik Yönetimi (Drizzle)
// GET: Günlük istatistikleri getir
// ============================================

import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import * as db from "$lib/server/db";

// GET - İstatistikleri getir
export const GET: RequestHandler = async ({ url }) => {
  try {
    const type = url.searchParams.get("type") ?? "live";
    const days = parseInt(url.searchParams.get("days") ?? "7");

    switch (type) {
      case "live": {
        // Canlı istatistikler
        const stats = await db.calculateLiveStats();

        return json({
          success: true,
          data: stats,
          type: "live",
        });
      }

      case "today": {
        // Bugünkü istatistikler
        const stats = await db.getTodayStats();

        return json({
          success: true,
          data: stats ?? {
            totalCalls: 0,
            completedCalls: 0,
            cancelledCalls: 0,
            averageWaitTime: 0,
            averageTripTime: 0,
            totalTrips: 0,
          },
          type: "today",
        });
      }

      case "history": {
        // Geçmiş istatistikler
        const stats = await db.getRecentStats(days);

        return json({
          success: true,
          data: stats,
          type: "history",
          days,
        });
      }

      case "calls": {
        // Bugünkü çağrı sayıları
        const counts = await db.getTodayCallCounts();

        return json({
          success: true,
          data: counts,
          type: "calls",
        });
      }

      case "tasks": {
        // Bugünkü görev sayıları
        const counts = await db.getTodayTaskCounts();

        return json({
          success: true,
          data: counts,
          type: "tasks",
        });
      }

      case "vehicles": {
        // Araç sayıları
        const counts = await db.getVehicleCounts();

        return json({
          success: true,
          data: counts,
          type: "vehicles",
        });
      }

      default:
        return error(
          400,
          "Geçersiz type. Kullanılabilir: live, today, history, calls, tasks, vehicles"
        );
    }
  } catch (err) {
    console.error("Stats GET error:", err);
    return error(500, "İstatistikler getirilirken hata oluştu");
  }
};
