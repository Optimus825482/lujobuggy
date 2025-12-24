// ============================================
// DATABASE SEED SCRIPT - Drizzle
// Lujo Hotel durakları ve araçları ekler
// ============================================

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/lib/server/db/schema";

// Hardcoded for seed script - production'da env kullanılır
const connectionString =
  "postgresql://postgres:518518Erkan@localhost:5432/buggy_shuttle";
const client = postgres(connectionString);
const db = drizzle(client, { schema });

// Lujo Hotel Durakları (KML'den)
const STOPS: schema.NewStop[] = [
  {
    name: "Ana Lobi",
    lat: 37.1385641,
    lng: 27.5607023,
    icon: "🏨",
    geofenceRadius: 15,
  },
  {
    name: "Spa",
    lat: 37.138297,
    lng: 27.5610773,
    icon: "🧖",
    geofenceRadius: 15,
  },
  {
    name: "Havuz 1",
    lat: 37.1382468,
    lng: 27.5606066,
    icon: "🏊",
    geofenceRadius: 15,
  },
  {
    name: "Havuz 2",
    lat: 37.1382992,
    lng: 27.5604684,
    icon: "🏊",
    geofenceRadius: 15,
  },
  {
    name: "Restoran",
    lat: 37.138622,
    lng: 27.5599749,
    icon: "🍽️",
    geofenceRadius: 15,
  },
  {
    name: "Blok A",
    lat: 37.138436,
    lng: 27.5593446,
    icon: "🏨",
    geofenceRadius: 15,
  },
  {
    name: "Villa 1",
    lat: 37.1383483,
    lng: 27.5570835,
    icon: "🏡",
    geofenceRadius: 15,
  },
  {
    name: "Villa 2",
    lat: 37.1379421,
    lng: 27.5572605,
    icon: "🏡",
    geofenceRadius: 15,
  },
  {
    name: "Villa 3",
    lat: 37.1384916,
    lng: 27.5576897,
    icon: "🏡",
    geofenceRadius: 15,
  },
  {
    name: "Villa 4",
    lat: 37.1380746,
    lng: 27.5578586,
    icon: "🏡",
    geofenceRadius: 15,
  },
  {
    name: "Blok B",
    lat: 37.1381318,
    lng: 27.5594036,
    icon: "🏨",
    geofenceRadius: 15,
  },
  {
    name: "Blok C",
    lat: 37.1379464,
    lng: 27.5603102,
    icon: "🏨",
    geofenceRadius: 15,
  },
  {
    name: "Beach Üst",
    lat: 37.1375444,
    lng: 27.5604979,
    icon: "🏖️",
    geofenceRadius: 15,
  },
  {
    name: "Beach Orta",
    lat: 37.13693,
    lng: 27.5603934,
    icon: "🏖️",
    geofenceRadius: 15,
  },
  {
    name: "Beach Alt",
    lat: 37.1362885,
    lng: 27.560455,
    icon: "🏖️",
    geofenceRadius: 15,
  },
  {
    name: "Beach Club",
    lat: 37.136111,
    lng: 27.5600795,
    icon: "🏖️",
    geofenceRadius: 15,
  },
  {
    name: "Sahil Yolu",
    lat: 37.1368403,
    lng: 27.5596653,
    icon: "🛤️",
    geofenceRadius: 15,
  },
  {
    name: "Plaj Giriş",
    lat: 37.1372785,
    lng: 27.5580652,
    icon: "🏖️",
    geofenceRadius: 15,
  },
  {
    name: "İskele",
    lat: 37.1359913,
    lng: 27.560616,
    icon: "⚓",
    geofenceRadius: 15,
  },
  {
    name: "Tenis Kortları",
    lat: 37.1377831,
    lng: 27.5616433,
    icon: "🎾",
    geofenceRadius: 15,
  },
];

// Varsayılan Araçlar
const VEHICLES: schema.NewVehicle[] = [
  {
    name: "Buggy 1",
    plateNumber: "48 LJ 001",
    lat: 37.1385641,
    lng: 27.5607023,
    status: "available",
  },
  {
    name: "Buggy 2",
    plateNumber: "48 LJ 002",
    lat: 37.1385641,
    lng: 27.5607023,
    status: "available",
  },
  {
    name: "Buggy 3",
    plateNumber: "48 LJ 003",
    lat: 37.1385641,
    lng: 27.5607023,
    status: "offline",
  },
];

// Varsayılan Ayarlar
const SETTINGS = [
  { key: "geofenceRadius", value: "15" },
  { key: "autoAssign", value: "true" },
  { key: "autoComplete", value: "true" },
  { key: "gpsUpdateInterval", value: "10000" },
  { key: "maxActiveCallsPerStop", value: "1" },
];

async function seed() {
  console.log("🌱 Seed başlatılıyor...\n");

  try {
    // Mevcut verileri temizle (sıralı - foreign key'ler nedeniyle)
    console.log("🗑️  Mevcut veriler temizleniyor...");
    await db.delete(schema.geofenceEvents);
    await db.delete(schema.vehiclePositions);
    await db.delete(schema.tasks);
    await db.delete(schema.calls);
    await db.delete(schema.dailyStats);
    await db.delete(schema.vehicles);
    await db.delete(schema.stops);
    await db.delete(schema.systemSettings);

    // Durakları ekle
    console.log("📍 Duraklar ekleniyor...");
    const insertedStops = await db
      .insert(schema.stops)
      .values(STOPS)
      .returning();
    console.log(`   ✅ ${insertedStops.length} durak eklendi`);

    // Araçları ekle
    console.log("🚗 Araçlar ekleniyor...");
    const insertedVehicles = await db
      .insert(schema.vehicles)
      .values(VEHICLES)
      .returning();
    console.log(`   ✅ ${insertedVehicles.length} araç eklendi`);

    // Ayarları ekle
    console.log("⚙️  Ayarlar ekleniyor...");
    await db.insert(schema.systemSettings).values(SETTINGS);
    console.log(`   ✅ ${SETTINGS.length} ayar eklendi`);

    // Bugünkü istatistik kaydı oluştur
    console.log("📊 Günlük istatistik kaydı oluşturuluyor...");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await db.insert(schema.dailyStats).values({ date: today });
    console.log("   ✅ Günlük istatistik kaydı oluşturuldu");

    console.log("\n✨ Seed tamamlandı!\n");

    // Özet
    console.log("📋 Özet:");
    console.log(`   - ${insertedStops.length} durak`);
    console.log(`   - ${insertedVehicles.length} araç`);
    console.log(`   - ${SETTINGS.length} ayar`);
    console.log("");
  } catch (error) {
    console.error("❌ Seed hatası:", error);
    await client.end();
    throw error;
  } finally {
    await client.end();
  }
}

seed();
