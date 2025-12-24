/**
 * Traccar Real-time Stream API (Server-Sent Events) - v4.0 WebSocket with Token
 *
 * GET /api/traccar/stream - Traccar WebSocket'e token ile bağlanır ve SSE olarak yayınlar
 *
 * Bu endpoint:
 * 1. Token ile Traccar session oluşturur
 * 2. Session cookie ile WebSocket bağlantısı kurar
 * 3. Gelen verileri SSE olarak client'a iletir
 * 4. Veritabanını otomatik günceller
 */

import type { RequestHandler } from "./$types";
import { env } from "$env/dynamic/private";
import { db } from "$lib/server/db";
import * as schema from "$lib/server/db/schema";
import { eq } from "drizzle-orm";
import { fullCorrection, correctHeading } from "$lib/server/gps-correction";
import { calculateDistance } from "$lib/utils/geo";
import { knotsToKmh } from "$lib/server/traccar";
import { updateTripStats } from "$lib/server/trip-detection";
import { recordStopEnter, recordStopExit } from "$lib/server/stop-visits";

const TRACCAR_URL = env.TRACCAR_URL || "https://traccar.optimistdemo.cloud";
const TRACCAR_TOKEN = env.TRACCAR_TOKEN || "";
const PING_INTERVAL = 15000;
const RECONNECT_DELAY = 3000;

export const GET: RequestHandler = async ({ request }) => {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let isClosing = false;
      let ws: WebSocket | null = null;
      let pingInterval: ReturnType<typeof setInterval> | null = null;
      let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

      // Son bilinen konumları sakla (değişiklik tespiti için)
      const lastPositions = new Map<
        number,
        { lat: number; lng: number; speed: number }
      >();

      // Durakları çek (GPS düzeltme için)
      const stops = await db.select().from(schema.stops);
      const stopsForCorrection = stops.map((s) => ({
        id: s.id,
        lng: s.lng,
        lat: s.lat,
        name: s.name,
      }));

      // Araç-Traccar ID eşleştirmesini çek
      let vehicles = await db.select().from(schema.vehicles);
      let vehicleMap = new Map(
        vehicles.filter((v) => v.traccarId).map((v) => [v.traccarId!, v])
      );

      function sendSSE(event: string, data: any) {
        if (isClosing) return;
        try {
          const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(message));
        } catch {
          // Stream kapalı olabilir
        }
      }

      // Position işleme fonksiyonu
      async function processPosition(position: any, device?: any) {
        if (!position.valid) return;

        const vehicle = vehicleMap.get(position.deviceId);
        if (!vehicle) return;

        // GPS Düzeltme
        let finalLat = position.latitude;
        let finalLng = position.longitude;
        let finalHeading = position.course;

        const correction = fullCorrection(
          position.longitude,
          position.latitude,
          stopsForCorrection,
          { stopSnapRadius: 15, routeMaxDistance: 40 }
        );

        finalLat = correction.lat;
        finalLng = correction.lng;

        if (correction.correctionType !== "none") {
          finalHeading = correctHeading(finalLng, finalLat, position.course);
        }

        // Değişiklik var mı kontrol et
        const lastPos = lastPositions.get(vehicle.id);
        const hasChanged =
          !lastPos ||
          Math.abs(lastPos.lat - finalLat) > 0.00001 ||
          Math.abs(lastPos.lng - finalLng) > 0.00001 ||
          Math.abs(lastPos.speed - knotsToKmh(position.speed)) > 0.5;

        if (!hasChanged) return;

        // Son pozisyonu güncelle
        lastPositions.set(vehicle.id, {
          lat: finalLat,
          lng: finalLng,
          speed: knotsToKmh(position.speed),
        });

        // En yakın durağı bul
        let nearestStopId: number | null = null;
        let nearestStopDistance = Infinity;

        for (const stop of stops) {
          const distance = calculateDistance(
            { lat: finalLat, lng: finalLng },
            { lat: stop.lat, lng: stop.lng }
          );
          const geofenceRadius = stop.geofenceRadius || 15;

          if (distance <= geofenceRadius && distance < nearestStopDistance) {
            nearestStopId = stop.id;
            nearestStopDistance = distance;
          }
        }

        // Durak giriş/çıkış kontrolü
        const previousStopId = vehicle.lastGeofenceStopId;

        if (nearestStopId && nearestStopId !== previousStopId) {
          if (previousStopId) {
            await recordStopExit(vehicle.id, previousStopId);
          }
          await recordStopEnter(vehicle.id, nearestStopId);

          sendSSE("stopVisit", {
            vehicleId: vehicle.id,
            vehicleName: vehicle.name,
            type: "enter",
            stopId: nearestStopId,
            timestamp: new Date().toISOString(),
          });
        } else if (!nearestStopId && previousStopId) {
          await recordStopExit(vehicle.id, previousStopId);

          sendSSE("stopVisit", {
            vehicleId: vehicle.id,
            vehicleName: vehicle.name,
            type: "exit",
            stopId: previousStopId,
            timestamp: new Date().toISOString(),
          });
        }

        // Durum belirleme
        // Position geliyorsa cihaz online demektir (device status "unknown" olsa bile)
        // Sadece device.status açıkça "offline" ise offline yap
        const isOnline = device?.status !== "offline"; // Position geldi = online
        let newStatus = vehicle.status;
        if (isOnline && vehicle.status === "offline") {
          newStatus = "available";
        }
        // NOT: Position geliyorsa offline yapma - sadece device status "offline" olduğunda offline yap

        // Veritabanını güncelle
        await db
          .update(schema.vehicles)
          .set({
            lat: finalLat,
            lng: finalLng,
            speed: knotsToKmh(position.speed),
            heading: finalHeading,
            gpsSignal: true, // Position geldi = GPS aktif
            status: newStatus,
            lastUpdate: new Date(position.serverTime),
            lastTraccarUpdate: new Date(),
            lastGeofenceStopId: nearestStopId,
            updatedAt: new Date(),
          })
          .where(eq(schema.vehicles.id, vehicle.id));

        // Trip istatistiklerini güncelle
        await updateTripStats(
          vehicle.id,
          knotsToKmh(position.speed),
          finalLat,
          finalLng
        );

        // SSE ile client'a gönder
        sendSSE("position", {
          vehicleId: vehicle.id,
          vehicleName: vehicle.name,
          lat: finalLat,
          lng: finalLng,
          speed: knotsToKmh(position.speed),
          heading: finalHeading,
          nearestStopId,
          status: newStatus,
          gpsSignal: true, // Position geldi = GPS aktif
          timestamp: position.serverTime,
        });
      }

      // WebSocket bağlantısı kur
      async function connectWebSocket() {
        if (isClosing) return;

        try {
          // 1. Token ile session oluştur
          console.log("[Traccar WS] Token ile session oluşturuluyor...");
          const sessionRes = await fetch(
            `${TRACCAR_URL}/api/session?token=${encodeURIComponent(
              TRACCAR_TOKEN
            )}`
          );

          if (!sessionRes.ok) {
            throw new Error(`Session failed: ${sessionRes.status}`);
          }

          // Session cookie'yi al
          const setCookie = sessionRes.headers.get("set-cookie");
          let sessionCookie = "";
          if (setCookie) {
            const match = setCookie.match(/JSESSIONID=([^;]+)/);
            if (match) {
              sessionCookie = match[1];
            }
          }

          if (!sessionCookie) {
            throw new Error("Session cookie alınamadı");
          }

          console.log(
            "[Traccar WS] Session oluşturuldu, WebSocket bağlanıyor..."
          );

          // 2. WebSocket bağlantısı kur
          const wsUrl = TRACCAR_URL.replace(/^http/, "ws") + "/api/socket";

          // Node.js WebSocket kullan
          const WebSocket = (await import("ws")).default;
          ws = new WebSocket(wsUrl, {
            headers: {
              Cookie: `JSESSIONID=${sessionCookie}`,
            },
          }) as any;

          ws.onopen = () => {
            console.log("[Traccar WS] Bağlantı kuruldu ✓");
            sendSSE("connected", {
              status: "connected",
              mode: "websocket",
              timestamp: new Date().toISOString(),
            });
          };

          ws.onmessage = async (event: any) => {
            try {
              const data = JSON.parse(
                typeof event.data === "string"
                  ? event.data
                  : event.data.toString()
              );

              // Debug log
              console.log("[Traccar WS] Mesaj alındı:", {
                hasPositions: !!data.positions?.length,
                hasDevices: !!data.devices?.length,
                positionCount: data.positions?.length || 0,
                positions: data.positions?.map((p: any) => ({
                  deviceId: p.deviceId,
                  lat: p.latitude,
                  lng: p.longitude,
                  speed: p.speed,
                })),
              });

              // Araç listesini güncelle (yeni eşleştirmeler için)
              vehicles = await db.select().from(schema.vehicles);
              vehicleMap = new Map(
                vehicles
                  .filter((v) => v.traccarId)
                  .map((v) => [v.traccarId!, v])
              );

              // Positions
              if (data.positions && Array.isArray(data.positions)) {
                for (const position of data.positions) {
                  const device = data.devices?.find(
                    (d: any) => d.id === position.deviceId
                  );
                  await processPosition(position, device);
                }
              }

              // Devices (status güncellemeleri)
              // NOT: Sadece "online" veya "offline" durumlarını işle, "unknown" durumunu atla
              if (data.devices && Array.isArray(data.devices)) {
                for (const device of data.devices) {
                  const vehicle = vehicleMap.get(device.id);
                  if (!vehicle) continue;

                  // "unknown" durumunu atla - bu geçici bir durum
                  if (device.status === "unknown") continue;

                  const isOnline = device.status === "online";

                  // Sadece gerçek değişiklik varsa güncelle
                  if (vehicle.gpsSignal !== isOnline) {
                    sendSSE("device", {
                      vehicleId: vehicle.id,
                      vehicleName: vehicle.name,
                      deviceStatus: device.status,
                      isOnline,
                      timestamp: new Date().toISOString(),
                    });

                    // DB güncelle
                    await db
                      .update(schema.vehicles)
                      .set({
                        gpsSignal: isOnline,
                        status: isOnline
                          ? vehicle.status === "offline"
                            ? "available"
                            : vehicle.status
                          : "offline",
                        updatedAt: new Date(),
                      })
                      .where(eq(schema.vehicles.id, vehicle.id));
                  }
                }
              }

              // Events
              if (data.events && Array.isArray(data.events)) {
                for (const event of data.events) {
                  const vehicle = vehicleMap.get(event.deviceId);
                  if (!vehicle) continue;

                  sendSSE("event", {
                    vehicleId: vehicle.id,
                    vehicleName: vehicle.name,
                    eventType: event.type,
                    geofenceId: event.geofenceId,
                    timestamp: event.eventTime,
                  });
                }
              }
            } catch (err) {
              console.error("[Traccar WS] Message parse error:", err);
            }
          };

          ws.onerror = (error: any) => {
            console.error("[Traccar WS] Hata:", error.message || error);
            sendSSE("error", {
              message: "WebSocket error",
              timestamp: new Date().toISOString(),
            });
          };

          ws.onclose = () => {
            console.log("[Traccar WS] Bağlantı kapandı");
            ws = null;

            if (!isClosing) {
              sendSSE("disconnected", {
                status: "disconnected",
                timestamp: new Date().toISOString(),
              });

              // Yeniden bağlan
              reconnectTimeout = setTimeout(() => {
                console.log("[Traccar WS] Yeniden bağlanılıyor...");
                connectWebSocket();
              }, RECONNECT_DELAY);
            }
          };
        } catch (error) {
          console.error("[Traccar WS] Bağlantı hatası:", error);
          sendSSE("error", {
            message: String(error),
            timestamp: new Date().toISOString(),
          });

          // Yeniden dene
          if (!isClosing) {
            reconnectTimeout = setTimeout(connectWebSocket, RECONNECT_DELAY);
          }
        }
      }

      // Ping interval
      pingInterval = setInterval(() => {
        sendSSE("ping", { timestamp: new Date().toISOString() });
      }, PING_INTERVAL);

      // WebSocket bağlantısını başlat
      await connectWebSocket();

      // Client bağlantısı kesildiğinde temizlik
      request.signal.addEventListener("abort", () => {
        console.log("[Traccar Stream] Client bağlantısı kesildi");
        isClosing = true;
        if (ws) {
          ws.close();
          ws = null;
        }
        if (pingInterval) clearInterval(pingInterval);
        if (reconnectTimeout) clearTimeout(reconnectTimeout);
        try {
          controller.close();
        } catch {
          // Controller zaten kapalı
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
};
