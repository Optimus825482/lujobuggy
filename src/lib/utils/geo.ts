// ============================================
// GEO UTILITIES - Coğrafi Hesaplamalar
// ============================================

export interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * İki koordinat arasındaki mesafeyi metre cinsinden hesaplar (Haversine formülü)
 */
export function calculateDistance(
  point1: Coordinates,
  point2: Coordinates
): number {
  const R = 6371000; // Dünya yarıçapı (metre)
  const dLat = toRad(point2.lat - point1.lat);
  const dLng = toRad(point2.lng - point1.lng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(point1.lat)) *
      Math.cos(toRad(point2.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Derece'yi radyana çevirir
 */
function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Bir noktanın geofence içinde olup olmadığını kontrol eder
 */
export function isInsideGeofence(
  point: Coordinates,
  center: Coordinates,
  radiusMeters: number
): boolean {
  const distance = calculateDistance(point, center);
  return distance <= radiusMeters;
}

/**
 * İki nokta arasındaki yönü (bearing) hesaplar (derece)
 */
export function calculateBearing(from: Coordinates, to: Coordinates): number {
  const dLng = toRad(to.lng - from.lng);
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  let bearing = Math.atan2(y, x) * (180 / Math.PI);
  bearing = (bearing + 360) % 360;

  return bearing;
}

/**
 * Bir noktadan belirli mesafe ve yönde yeni nokta hesaplar
 */
export function destinationPoint(
  start: Coordinates,
  distanceMeters: number,
  bearingDegrees: number
): Coordinates {
  const R = 6371000; // Dünya yarıçapı (metre)
  const d = distanceMeters / R;
  const brng = toRad(bearingDegrees);
  const lat1 = toRad(start.lat);
  const lng1 = toRad(start.lng);

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brng)
  );

  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
    );

  return {
    lat: lat2 * (180 / Math.PI),
    lng: lng2 * (180 / Math.PI),
  };
}

/**
 * Bir rota üzerinde en yakın noktayı bulur
 */
export function findNearestPointOnRoute(
  point: Coordinates,
  route: [number, number][]
): { point: Coordinates; distance: number; segmentIndex: number } {
  let minDistance = Infinity;
  let nearestPoint: Coordinates = { lat: 0, lng: 0 };
  let segmentIndex = 0;

  for (let i = 0; i < route.length - 1; i++) {
    const start: Coordinates = { lat: route[i][0], lng: route[i][1] };
    const end: Coordinates = { lat: route[i + 1][0], lng: route[i + 1][1] };

    const nearest = nearestPointOnSegment(point, start, end);
    const distance = calculateDistance(point, nearest);

    if (distance < minDistance) {
      minDistance = distance;
      nearestPoint = nearest;
      segmentIndex = i;
    }
  }

  return { point: nearestPoint, distance: minDistance, segmentIndex };
}

/**
 * Bir çizgi parçası üzerinde en yakın noktayı bulur
 */
function nearestPointOnSegment(
  point: Coordinates,
  start: Coordinates,
  end: Coordinates
): Coordinates {
  const dx = end.lng - start.lng;
  const dy = end.lat - start.lat;

  if (dx === 0 && dy === 0) {
    return start;
  }

  const t = Math.max(
    0,
    Math.min(
      1,
      ((point.lng - start.lng) * dx + (point.lat - start.lat) * dy) /
        (dx * dx + dy * dy)
    )
  );

  return {
    lat: start.lat + t * dy,
    lng: start.lng + t * dx,
  };
}
