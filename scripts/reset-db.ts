/// <reference types="node" />
import postgres from "postgres";

const DATABASE_URL =
  "postgresql://postgres:518518Erkan@localhost:5432/buggy_shuttle";

async function resetDatabase() {
  const sql = postgres(DATABASE_URL);

  console.log("🔄 Veritabanı sıfırlanıyor...");

  try {
    // 1. Tüm task'ları sil
    const deletedTasks = await sql`DELETE FROM tasks RETURNING id`;
    console.log(`✅ ${deletedTasks.length} task silindi`);

    // 2. Assigned çağrıları pending yap
    const updatedCalls = await sql`
      UPDATE calls 
      SET status = 'pending', assigned_vehicle_id = NULL 
      WHERE status = 'assigned' 
      RETURNING id
    `;
    console.log(`✅ ${updatedCalls.length} çağrı pending yapıldı`);

    // 3. Busy araçları available yap
    const updatedVehicles = await sql`
      UPDATE vehicles 
      SET status = 'available' 
      WHERE status = 'busy' 
      RETURNING id
    `;
    console.log(`✅ ${updatedVehicles.length} araç available yapıldı`);

    console.log("🎉 Veritabanı sıfırlandı!");
  } catch (err) {
    console.error("❌ Hata:", err);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

resetDatabase();
