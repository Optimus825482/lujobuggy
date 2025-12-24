// ============================================
// STOPS API - Durak Yönetimi (Drizzle)
// GET: Tüm durakları listele
// POST: Yeni durak ekle
// ============================================

import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import * as db from "$lib/server/db";

// GET - Tüm durakları listele
export const GET: RequestHandler = async ({ url }) => {
  try {
    const activeOnly = url.searchParams.get("active") !== "false";
    const stops = await db.getAllStops(activeOnly);

    return json({
      success: true,
      data: stops,
      count: stops.length,
    });
  } catch (err) {
    console.error("Stops GET error:", err);
    return error(500, "Duraklar getirilirken hata oluştu");
  }
};

// POST - Yeni durak ekle
export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();

    if (!body.name || body.lat === undefined || body.lng === undefined) {
      return error(400, "name, lat ve lng zorunludur");
    }

    const stop = await db.createStop({
      name: body.name,
      icon: body.icon ?? "📍",
      lat: parseFloat(body.lat),
      lng: parseFloat(body.lng),
      geofenceRadius: body.geofenceRadius ? parseInt(body.geofenceRadius) : 15,
    });

    return json(
      { success: true, data: stop, message: "Durak eklendi" },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error("Stop POST error:", err);

    if (err instanceof Error && err.message.includes("unique")) {
      return error(409, "Bu isimde bir durak zaten var");
    }

    return error(500, "Durak eklenirken hata oluştu");
  }
};
