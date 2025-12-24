// ============================================
// SETTINGS API - Sistem Ayarları (Drizzle)
// GET: Tüm ayarları getir
// PUT: Ayarları güncelle
// ============================================

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import * as db from "$lib/server/db";

export const GET: RequestHandler = async () => {
  try {
    const settings = await db.getAllSettings();

    const settingsObj: Record<string, unknown> = {};
    settings.forEach((s) => {
      try {
        settingsObj[s.key] = JSON.parse(s.value);
      } catch {
        settingsObj[s.key] = s.value;
      }
    });

    return json({ success: true, data: settingsObj });
  } catch (error) {
    console.error("Settings fetch error:", error);
    return json(
      { success: false, error: "Ayarlar yüklenemedi" },
      { status: 500 }
    );
  }
};

export const PUT: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();

    await db.setSettings(body);

    return json({ success: true, message: "Ayarlar kaydedildi" });
  } catch (error) {
    console.error("Settings update error:", error);
    return json(
      { success: false, error: "Ayarlar kaydedilemedi" },
      { status: 500 }
    );
  }
};
