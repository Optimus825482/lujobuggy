/**
 * GPS Konum Düzeltme - Snap to Route
 *
 * GPS'ten gelen koordinatları rota çizgilerine yapıştırır.
 * Bu sayede araçlar her zaman rota üzerinde görünür.
 */

// Buggy rotaları - tüm koordinatlar
const ROUTE_COORDINATES: [number, number][] = [
  // Rota 1
  [27.560724, 37.138598],
  [27.5606261, 37.1385691],
  [27.5605443, 37.1384889],
  [27.5603982, 37.1384964],
  [27.5602882, 37.138599],
  [27.5602252, 37.1386696],
  [27.5601836, 37.1387006],
  [27.5601205, 37.1387049],
  [27.5601192, 37.1386643],
  [27.5601728, 37.138598],
  [27.5602533, 37.1385039],
  [27.5604089, 37.1383863],
  [27.5605376, 37.1382767],
  [27.5607227, 37.138142],
  [27.5609292, 37.1381548],
  [27.5610312, 37.1382125],
  [27.5611492, 37.1383644],
  [27.5613557, 37.1387663],
  [27.5613047, 37.1387941],
  [27.5612055, 37.1387663],
  [27.5610982, 37.1385504],
  [27.5610124, 37.1385653],
  [27.5609614, 37.1386851],
  [27.5607495, 37.1385996],
  // Rota 2
  [27.5600924, 37.1386728],
  [27.5599673, 37.1386413],
  [27.5598131, 37.1386274],
  [27.5596602, 37.1385707],
  [27.559569, 37.1385408],
  [27.5594242, 37.1384766],
  [27.5592766, 37.1384446],
  [27.5590889, 37.1385365],
  [27.5589682, 37.1385729],
  [27.5588394, 37.1385878],
  [27.5587643, 37.1386584],
  [27.5586919, 37.1387161],
  [27.5586462, 37.1386968],
  [27.5586436, 37.1386604],
  [27.5587187, 37.1385749],
  [27.5587669, 37.1384979],
  // Rota 3
  [27.5587609, 37.1384824],
  [27.5586429, 37.1384568],
  [27.5585034, 37.138337],
  [27.5582406, 37.1383071],
  [27.5580206, 37.1384226],
  [27.5577041, 37.1385851],
  [27.55757, 37.138692],
  [27.5573769, 37.1387176],
  [27.5571355, 37.138692],
  [27.5570336, 37.1386022],
  [27.5571355, 37.1383627],
  [27.5572321, 37.1380719],
  [27.5572804, 37.1379308],
  [27.5574466, 37.1379821],
  [27.5577202, 37.1380377],
  [27.5579187, 37.138042],
  [27.5581869, 37.1379778],
  [27.5587824, 37.1379949],
  [27.5586322, 37.1384611],
  // Rota 4
  [27.5587464, 37.1381147],
  [27.5588564, 37.1382023],
  [27.5589476, 37.1382152],
  [27.5594036, 37.1381318],
  [27.5598676, 37.1382836],
  [27.5600902, 37.1381895],
  [27.5605864, 37.1377726],
  [27.5607447, 37.1375758],
  [27.5605945, 37.1375074],
  [27.5602565, 37.137516],
  [27.5600044, 37.1375331],
  [27.5598757, 37.1376357],
  [27.5597576, 37.1376999],
  [27.5595431, 37.1377512],
  [27.5590227, 37.1378752],
  [27.5588081, 37.1379607],
  [27.5587824, 37.1379949],
  // Rota 5
  [27.5599443, 37.1375972],
  [27.5598477, 37.1374262],
  [27.5597994, 37.1371952],
  [27.5601588, 37.1369643],
  [27.5604968, 37.1366564],
  [27.5604539, 37.136233],
  [27.5601374, 37.1361603],
  [27.5600086, 37.1362288],
  [27.5596653, 37.1368403],
  [27.5594239, 37.1369215],
  [27.5584154, 37.1371739],
  [27.5579809, 37.1372551],
  // Rota 6
  [27.5604539, 37.136233],
  [27.5605447, 37.1360256],
  [27.5607969, 37.1357647],
  [27.5610329, 37.1357904],
  [27.5612689, 37.135923],
  [27.561564, 37.1361026],
  [27.5617035, 37.1365259],
  [27.5617893, 37.1374924],
  [27.5618429, 37.1381339],
  [27.5619019, 37.138754],
  [27.5618697, 37.1388566],
  [27.5618161, 37.1388994],
  [27.5615801, 37.1388737],
  [27.5613557, 37.1387663],
];

// Rota segmentleri (her iki ardışık nokta bir segment)
interface RouteSegment {
  start: [number, number];
  end: [number, number];
}

/**
 * Haversine formülü ile iki nokta arasındaki mesafeyi metre cinsinden hesaplar
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Dünya yarıçapı metre
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Bir noktanın bir doğru segmentine olan en yakın noktasını bulur
 * (Perpendicular projection / Dik izdüşüm)
 */
function projectPointOnSegment(
  point: [number, number],
  segmentStart: [number, number],
  segmentEnd: [number, number]
): { projected: [number, number]; distance: number; t: number } {
  const [px, py] = point; // lng, lat
  const [ax, ay] = segmentStart;
  const [bx, by] = segmentEnd;

  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;

  const ab2 = abx * abx + aby * aby;

  if (ab2 === 0) {
    // Segment bir nokta
    return {
      projected: segmentStart,
      distance: haversineDistance(py, px, ay, ax),
      t: 0,
    };
  }

  // t parametresi: 0 = start, 1 = end
  let t = (apx * abx + apy * aby) / ab2;

  // Segment sınırları içinde tut
  t = Math.max(0, Math.min(1, t));

  // Projeksiyon noktası
  const projectedLng = ax + t * abx;
  const projectedLat = ay + t * aby;

  const distance = haversineDistance(py, px, projectedLat, projectedLng);

  return {
    projected: [projectedLng, projectedLat],
    distance,
    t,
  };
}

/**
 * GPS koordinatını en yakın rota noktasına yapıştırır (snap to route)
 *
 * @param lng GPS boylam
 * @param lat GPS enlem
 * @param maxDistance Maksimum düzeltme mesafesi (metre). Bu mesafeden uzaksa düzeltme yapılmaz.
 * @returns Düzeltilmiş koordinatlar veya orijinal koordinatlar
 */
export function snapToRoute(
  lng: number,
  lat: number,
  maxDistance: number = 50 // 50 metre varsayılan
): {
  lng: number;
  lat: number;
  snapped: boolean;
  distance: number;
  originalLng: number;
  originalLat: number;
} {
  let minDistance = Infinity;
  let nearestPoint: [number, number] = [lng, lat];
  let snapped = false;

  // Tüm rota segmentlerini kontrol et
  for (let i = 0; i < ROUTE_COORDINATES.length - 1; i++) {
    const segmentStart = ROUTE_COORDINATES[i];
    const segmentEnd = ROUTE_COORDINATES[i + 1];

    // İki ardışık nokta arasındaki mesafe çok büyükse (farklı rota parçaları), atla
    const segmentLength = haversineDistance(
      segmentStart[1],
      segmentStart[0],
      segmentEnd[1],
      segmentEnd[0]
    );
    if (segmentLength > 200) continue; // 200 metreden uzun segmentler farklı rotalardır

    const projection = projectPointOnSegment(
      [lng, lat],
      segmentStart,
      segmentEnd
    );

    if (projection.distance < minDistance) {
      minDistance = projection.distance;
      nearestPoint = projection.projected;
    }
  }

  // Maksimum mesafe kontrolü
  if (minDistance <= maxDistance) {
    snapped = true;
    return {
      lng: nearestPoint[0],
      lat: nearestPoint[1],
      snapped: true,
      distance: minDistance,
      originalLng: lng,
      originalLat: lat,
    };
  }

  // Çok uzaksa orijinal koordinatları döndür
  return {
    lng,
    lat,
    snapped: false,
    distance: minDistance,
    originalLng: lng,
    originalLat: lat,
  };
}

/**
 * En yakın rota noktasını bulur (segment değil, tam nokta)
 */
export function findNearestRoutePoint(
  lng: number,
  lat: number
): { point: [number, number]; distance: number; index: number } {
  let minDistance = Infinity;
  let nearestIndex = 0;

  for (let i = 0; i < ROUTE_COORDINATES.length; i++) {
    const [routeLng, routeLat] = ROUTE_COORDINATES[i];
    const distance = haversineDistance(lat, lng, routeLat, routeLng);

    if (distance < minDistance) {
      minDistance = distance;
      nearestIndex = i;
    }
  }

  return {
    point: ROUTE_COORDINATES[nearestIndex],
    distance: minDistance,
    index: nearestIndex,
  };
}

/**
 * Araç yönünü (heading) rota yönüne göre düzeltir
 */
export function correctHeading(
  lng: number,
  lat: number,
  currentHeading: number
): number {
  const nearest = findNearestRoutePoint(lng, lat);
  const nextIndex = Math.min(nearest.index + 1, ROUTE_COORDINATES.length - 1);

  if (nearest.index === nextIndex) return currentHeading;

  const [currentLng, currentLat] = ROUTE_COORDINATES[nearest.index];
  const [nextLng, nextLat] = ROUTE_COORDINATES[nextIndex];

  // İki nokta arasındaki yönü hesapla
  const dLng = nextLng - currentLng;
  const dLat = nextLat - currentLat;

  let heading = (Math.atan2(dLng, dLat) * 180) / Math.PI;
  if (heading < 0) heading += 360;

  return heading;
}

/**
 * Batch düzeltme - birden fazla araç için
 */
export function snapMultipleToRoute(
  positions: Array<{ id: number; lng: number; lat: number; heading?: number }>,
  maxDistance: number = 50
): Array<{
  id: number;
  lng: number;
  lat: number;
  heading: number;
  snapped: boolean;
  distance: number;
}> {
  return positions.map((pos) => {
    const snapped = snapToRoute(pos.lng, pos.lat, maxDistance);
    const heading = correctHeading(snapped.lng, snapped.lat, pos.heading || 0);

    return {
      id: pos.id,
      lng: snapped.lng,
      lat: snapped.lat,
      heading,
      snapped: snapped.snapped,
      distance: snapped.distance,
    };
  });
}

/**
 * Durak (geofence) bazlı düzeltme
 * Araç bir durağın yakınındaysa, tam durak koordinatına çeker
 */
export function snapToStop(
  lng: number,
  lat: number,
  stops: Array<{ id: number; lng: number; lat: number; name: string }>,
  snapRadius: number = 20 // 20 metre içindeyse durağa çek
): {
  lng: number;
  lat: number;
  snappedToStop: boolean;
  stopId?: number;
  stopName?: string;
} {
  for (const stop of stops) {
    const distance = haversineDistance(lat, lng, stop.lat, stop.lng);

    if (distance <= snapRadius) {
      return {
        lng: stop.lng,
        lat: stop.lat,
        snappedToStop: true,
        stopId: stop.id,
        stopName: stop.name,
      };
    }
  }

  return {
    lng,
    lat,
    snappedToStop: false,
  };
}

/**
 * Tam düzeltme: Önce durağa, sonra rotaya snap
 */
export function fullCorrection(
  lng: number,
  lat: number,
  stops: Array<{ id: number; lng: number; lat: number; name: string }>,
  options: {
    stopSnapRadius?: number;
    routeMaxDistance?: number;
  } = {}
): {
  lng: number;
  lat: number;
  correctionType: "stop" | "route" | "none";
  stopId?: number;
  stopName?: string;
  distance: number;
} {
  const { stopSnapRadius = 20, routeMaxDistance = 50 } = options;

  // Önce durağa snap dene
  const stopSnap = snapToStop(lng, lat, stops, stopSnapRadius);
  if (stopSnap.snappedToStop) {
    return {
      lng: stopSnap.lng,
      lat: stopSnap.lat,
      correctionType: "stop",
      stopId: stopSnap.stopId,
      stopName: stopSnap.stopName,
      distance: 0,
    };
  }

  // Durağa snap olmadıysa rotaya snap dene
  const routeSnap = snapToRoute(lng, lat, routeMaxDistance);
  if (routeSnap.snapped) {
    return {
      lng: routeSnap.lng,
      lat: routeSnap.lat,
      correctionType: "route",
      distance: routeSnap.distance,
    };
  }

  // Hiçbirine snap olmadı
  return {
    lng,
    lat,
    correctionType: "none",
    distance: routeSnap.distance,
  };
}
