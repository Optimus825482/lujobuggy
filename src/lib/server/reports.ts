/**
 * Report Generation Service
 *
 * Profesyonel PDF ve Excel raporları oluşturur:
 * - Türkçe karakter desteği
 * - Grafikler (bar, pie chart)
 * - Tablolar
 * - Özet istatistikler
 */

import ExcelJS from "exceljs";
import { db } from "./db";
import * as schema from "./db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";
import { ChartJSNodeCanvas } from "chartjs-node-canvas";

// ============================================================================
// TYPES
// ============================================================================

export interface ReportData {
  title: string;
  dateRange: { from: Date; to: Date };
  generatedAt: Date;
  summary: ReportSummary;
  vehicles: VehicleReportData[];
  trips: TripReportData[];
  calls: CallReportData[];
  dailyStats: DailyStatData[];
}

export interface ReportSummary {
  totalVehicles: number;
  activeVehicles: number;
  totalTrips: number;
  totalDistance: number;
  totalDuration: number;
  avgSpeed: number;
  totalCalls: number;
  completedCalls: number;
  cancelledCalls: number;
  avgWaitTime: number;
}

export interface VehicleReportData {
  id: number;
  name: string;
  plateNumber: string;
  tripCount: number;
  totalDistance: number;
  totalDuration: number;
  avgSpeed: number;
  maxSpeed: number;
  onlineTime: number;
}

export interface TripReportData {
  id: number;
  vehicleName: string;
  startTime: Date;
  endTime: Date | null;
  duration: number;
  distance: number;
  avgSpeed: number;
  maxSpeed: number;
  startLocation: string;
  endLocation: string;
}

export interface CallReportData {
  id: number;
  stopName: string;
  status: string;
  vehicleName: string | null;
  createdAt: Date;
  assignedAt: Date | null;
  completedAt: Date | null;
  waitTime: number | null;
}

export interface DailyStatData {
  date: Date;
  totalCalls: number;
  completedCalls: number;
  cancelledCalls: number;
  totalTrips: number;
  avgWaitTime: number;
}

// ============================================================================
// CHART GENERATOR (Server-side)
// ============================================================================

const chartWidth = 600;
const chartHeight = 300;

const chartJSNodeCanvas = new ChartJSNodeCanvas({
  width: chartWidth,
  height: chartHeight,
  backgroundColour: "white",
});

/**
 * Araç performans bar chart oluşturur
 */
async function generateVehicleBarChart(
  vehicles: VehicleReportData[]
): Promise<Buffer> {
  const config = {
    type: "bar" as const,
    data: {
      labels: vehicles.slice(0, 6).map((v) => v.name),
      datasets: [
        {
          label: "Mesafe (km)",
          data: vehicles.slice(0, 6).map((v) => v.totalDistance),
          backgroundColor: "rgba(8, 145, 178, 0.8)",
          borderColor: "rgb(8, 145, 178)",
          borderWidth: 1,
        },
        {
          label: "Seyahat Sayisi",
          data: vehicles.slice(0, 6).map((v) => v.tripCount),
          backgroundColor: "rgba(34, 197, 94, 0.8)",
          borderColor: "rgb(34, 197, 94)",
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: false,
      plugins: {
        title: { display: true, text: "Arac Performansi", font: { size: 16 } },
        legend: { position: "top" as const },
      },
      scales: {
        y: { beginAtZero: true },
      },
    },
  };
  return await chartJSNodeCanvas.renderToBuffer(config);
}

/**
 * Çağrı durumu pie chart oluşturur
 */
async function generateCallsPieChart(summary: ReportSummary): Promise<Buffer> {
  const config = {
    type: "pie" as const,
    data: {
      labels: ["Tamamlanan", "Iptal Edilen", "Bekleyen"],
      datasets: [
        {
          data: [
            summary.completedCalls,
            summary.cancelledCalls,
            summary.totalCalls -
              summary.completedCalls -
              summary.cancelledCalls,
          ],
          backgroundColor: [
            "rgba(34, 197, 94, 0.8)",
            "rgba(239, 68, 68, 0.8)",
            "rgba(234, 179, 8, 0.8)",
          ],
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: false,
      plugins: {
        title: { display: true, text: "Cagri Dagilimi", font: { size: 16 } },
        legend: { position: "right" as const },
      },
    },
  };
  return await chartJSNodeCanvas.renderToBuffer(config);
}

// ============================================================================
// REPORT DATA COLLECTION
// ============================================================================

export async function collectReportData(
  from: Date,
  to: Date,
  vehicleId?: number
): Promise<ReportData> {
  // Araçları çek
  const vehiclesQuery = vehicleId
    ? db.select().from(schema.vehicles).where(eq(schema.vehicles.id, vehicleId))
    : db.select().from(schema.vehicles);
  const vehicles = await vehiclesQuery;

  // Trip'leri çek
  let tripsQuery = db
    .select()
    .from(schema.trips)
    .where(
      and(gte(schema.trips.startTime, from), lte(schema.trips.startTime, to))
    )
    .orderBy(desc(schema.trips.startTime));

  if (vehicleId) {
    tripsQuery = db
      .select()
      .from(schema.trips)
      .where(
        and(
          gte(schema.trips.startTime, from),
          lte(schema.trips.startTime, to),
          eq(schema.trips.vehicleId, vehicleId)
        )
      )
      .orderBy(desc(schema.trips.startTime));
  }
  const trips = await tripsQuery;

  // Çağrıları çek
  const calls = await db
    .select({
      call: schema.calls,
      stop: schema.stops,
      vehicle: schema.vehicles,
    })
    .from(schema.calls)
    .leftJoin(schema.stops, eq(schema.calls.stopId, schema.stops.id))
    .leftJoin(
      schema.vehicles,
      eq(schema.calls.assignedVehicleId, schema.vehicles.id)
    )
    .where(
      and(gte(schema.calls.createdAt, from), lte(schema.calls.createdAt, to))
    )
    .orderBy(desc(schema.calls.createdAt));

  // Durakları çek
  const stops = await db.select().from(schema.stops);
  const stopsMap = new Map(stops.map((s) => [s.id, s]));

  // Özet hesapla
  const totalDistance =
    trips.reduce((sum, t) => sum + (t.distance || 0), 0) / 1000;
  const totalDuration =
    trips.reduce((sum, t) => sum + (t.duration || 0), 0) / 60;
  const avgSpeed =
    trips.length > 0
      ? trips.reduce((sum, t) => sum + (t.avgSpeed || 0), 0) / trips.length
      : 0;

  const completedCalls = calls.filter(
    (c) => c.call.status === "completed"
  ).length;
  const cancelledCalls = calls.filter(
    (c) => c.call.status === "cancelled"
  ).length;

  const waitTimes = calls
    .filter((c) => c.call.assignedAt && c.call.createdAt)
    .map((c) => {
      const created = new Date(c.call.createdAt).getTime();
      const assigned = new Date(c.call.assignedAt!).getTime();
      return (assigned - created) / 60000;
    });
  const avgWaitTime =
    waitTimes.length > 0
      ? waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length
      : 0;

  // Araç bazlı veriler
  const vehicleReports: VehicleReportData[] = vehicles.map((v) => {
    const vehicleTrips = trips.filter((t) => t.vehicleId === v.id);
    const vTotalDistance =
      vehicleTrips.reduce((sum, t) => sum + (t.distance || 0), 0) / 1000;
    const vTotalDuration =
      vehicleTrips.reduce((sum, t) => sum + (t.duration || 0), 0) / 60;
    const vAvgSpeed =
      vehicleTrips.length > 0
        ? vehicleTrips.reduce((sum, t) => sum + (t.avgSpeed || 0), 0) /
          vehicleTrips.length
        : 0;
    const vMaxSpeed = Math.max(...vehicleTrips.map((t) => t.maxSpeed || 0), 0);

    return {
      id: v.id,
      name: v.name,
      plateNumber: v.plateNumber,
      tripCount: vehicleTrips.length,
      totalDistance: Math.round(vTotalDistance * 100) / 100,
      totalDuration: Math.round(vTotalDuration),
      avgSpeed: Math.round(vAvgSpeed * 10) / 10,
      maxSpeed: Math.round(vMaxSpeed * 10) / 10,
      onlineTime: 0,
    };
  });

  // Trip verileri
  const tripReports: TripReportData[] = trips.map((t) => {
    const vehicle = vehicles.find((v) => v.id === t.vehicleId);
    const startStop = t.startStopId ? stopsMap.get(t.startStopId) : null;
    const endStop = t.endStopId ? stopsMap.get(t.endStopId) : null;

    return {
      id: t.id,
      vehicleName: vehicle?.name || "Bilinmiyor",
      startTime: t.startTime,
      endTime: t.endTime,
      duration: Math.round((t.duration || 0) / 60),
      distance: Math.round(((t.distance || 0) / 1000) * 100) / 100,
      avgSpeed: Math.round((t.avgSpeed || 0) * 10) / 10,
      maxSpeed: Math.round((t.maxSpeed || 0) * 10) / 10,
      startLocation:
        startStop?.name ||
        `${t.startLat?.toFixed(5)}, ${t.startLng?.toFixed(5)}`,
      endLocation:
        endStop?.name ||
        (t.endLat ? `${t.endLat.toFixed(5)}, ${t.endLng?.toFixed(5)}` : "-"),
    };
  });

  // Çağrı verileri
  const callReports: CallReportData[] = calls.map((c) => {
    let waitTime: number | null = null;
    if (c.call.assignedAt && c.call.createdAt) {
      waitTime = Math.round(
        (new Date(c.call.assignedAt).getTime() -
          new Date(c.call.createdAt).getTime()) /
          60000
      );
    }
    return {
      id: c.call.id,
      stopName: c.stop?.name || "Bilinmiyor",
      status: c.call.status,
      vehicleName: c.vehicle?.name || null,
      createdAt: c.call.createdAt,
      assignedAt: c.call.assignedAt,
      completedAt: c.call.completedAt,
      waitTime,
    };
  });

  return {
    title: vehicleId ? `${vehicles[0]?.name || "Arac"} Raporu` : "Genel Rapor",
    dateRange: { from, to },
    generatedAt: new Date(),
    summary: {
      totalVehicles: vehicles.length,
      activeVehicles: vehicles.filter((v) => v.status !== "offline").length,
      totalTrips: trips.length,
      totalDistance: Math.round(totalDistance * 100) / 100,
      totalDuration: Math.round(totalDuration),
      avgSpeed: Math.round(avgSpeed * 10) / 10,
      totalCalls: calls.length,
      completedCalls,
      cancelledCalls,
      avgWaitTime: Math.round(avgWaitTime * 10) / 10,
    },
    vehicles: vehicleReports,
    trips: tripReports,
    calls: callReports,
    dailyStats: [],
  };
}

// ============================================================================
// EXCEL EXPORT
// ============================================================================

export async function generateExcelReport(data: ReportData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Buggy Shuttle";
  workbook.created = new Date();

  // Özet Sayfası
  const summarySheet = workbook.addWorksheet("Ozet");
  addSummarySheet(summarySheet, data);

  // Araçlar Sayfası
  if (data.vehicles.length > 0) {
    const vehiclesSheet = workbook.addWorksheet("Araclar");
    addVehiclesSheet(vehiclesSheet, data.vehicles);
  }

  // Seyahatler Sayfası
  if (data.trips.length > 0) {
    const tripsSheet = workbook.addWorksheet("Seyahatler");
    addTripsSheet(tripsSheet, data.trips);
  }

  // Çağrılar Sayfası
  if (data.calls.length > 0) {
    const callsSheet = workbook.addWorksheet("Cagrilar");
    addCallsSheet(callsSheet, data.calls);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function addSummarySheet(sheet: ExcelJS.Worksheet, data: ReportData) {
  sheet.mergeCells("A1:D1");
  const titleCell = sheet.getCell("A1");
  titleCell.value = data.title;
  titleCell.font = { size: 18, bold: true, color: { argb: "FF0891B2" } };
  titleCell.alignment = { horizontal: "center" };

  sheet.mergeCells("A2:D2");
  const dateCell = sheet.getCell("A2");
  dateCell.value = `${formatDate(data.dateRange.from)} - ${formatDate(
    data.dateRange.to
  )}`;
  dateCell.font = { size: 12, color: { argb: "FF64748B" } };
  dateCell.alignment = { horizontal: "center" };

  sheet.addRow([]);

  const summaryData = [
    ["Metrik", "Deger"],
    ["Toplam Arac", data.summary.totalVehicles],
    ["Aktif Arac", data.summary.activeVehicles],
    ["Toplam Seyahat", data.summary.totalTrips],
    ["Toplam Mesafe", `${data.summary.totalDistance} km`],
    ["Toplam Sure", `${data.summary.totalDuration} dk`],
    ["Ortalama Hiz", `${data.summary.avgSpeed} km/h`],
    ["Toplam Cagri", data.summary.totalCalls],
    ["Tamamlanan Cagri", data.summary.completedCalls],
    ["Iptal Edilen Cagri", data.summary.cancelledCalls],
    ["Ort. Bekleme Suresi", `${data.summary.avgWaitTime} dk`],
  ];

  summaryData.forEach((row, index) => {
    const excelRow = sheet.addRow(row);
    if (index === 0) {
      excelRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF0891B2" },
      };
      excelRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    }
  });

  sheet.getColumn(1).width = 25;
  sheet.getColumn(2).width = 20;
}

function addVehiclesSheet(
  sheet: ExcelJS.Worksheet,
  vehicles: VehicleReportData[]
) {
  const headers = [
    "Arac Adi",
    "Plaka",
    "Seyahat Sayisi",
    "Toplam Mesafe (km)",
    "Toplam Sure (dk)",
    "Ort. Hiz (km/h)",
    "Max Hiz (km/h)",
  ];
  const headerRow = sheet.addRow(headers);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0891B2" },
  };

  vehicles.forEach((v) => {
    sheet.addRow([
      v.name,
      v.plateNumber,
      v.tripCount,
      v.totalDistance,
      v.totalDuration,
      v.avgSpeed,
      v.maxSpeed,
    ]);
  });

  sheet.columns.forEach((col) => {
    col.width = 18;
  });
}

function addTripsSheet(sheet: ExcelJS.Worksheet, trips: TripReportData[]) {
  const headers = [
    "Arac",
    "Baslangic",
    "Bitis",
    "Sure (dk)",
    "Mesafe (km)",
    "Ort. Hiz",
    "Max Hiz",
    "Baslangic Konum",
    "Bitis Konum",
  ];
  const headerRow = sheet.addRow(headers);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0891B2" },
  };

  trips.forEach((t) => {
    sheet.addRow([
      t.vehicleName,
      formatDateTime(t.startTime),
      t.endTime ? formatDateTime(t.endTime) : "-",
      t.duration,
      t.distance,
      t.avgSpeed,
      t.maxSpeed,
      t.startLocation,
      t.endLocation,
    ]);
  });

  sheet.columns.forEach((col) => {
    col.width = 18;
  });
}

function addCallsSheet(sheet: ExcelJS.Worksheet, calls: CallReportData[]) {
  const headers = [
    "Durak",
    "Durum",
    "Arac",
    "Olusturulma",
    "Atanma",
    "Tamamlanma",
    "Bekleme (dk)",
  ];
  const headerRow = sheet.addRow(headers);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0891B2" },
  };

  const statusMap: Record<string, string> = {
    pending: "Bekliyor",
    assigned: "Atandi",
    completed: "Tamamlandi",
    cancelled: "Iptal",
  };

  calls.forEach((c) => {
    sheet.addRow([
      c.stopName,
      statusMap[c.status] || c.status,
      c.vehicleName || "-",
      formatDateTime(c.createdAt),
      c.assignedAt ? formatDateTime(c.assignedAt) : "-",
      c.completedAt ? formatDateTime(c.completedAt) : "-",
      c.waitTime ?? "-",
    ]);
  });

  sheet.columns.forEach((col) => {
    col.width = 18;
  });
}

// ============================================================================
// PDF EXPORT - Profesyonel Tasarim
// ============================================================================

import PdfPrinter from "pdfmake";
import type {
  TDocumentDefinitions,
  Content,
  TableCell,
} from "pdfmake/interfaces";
import * as path from "path";

// Font tanımları - Roboto fontları (Türkçe karakter desteği)
const fontsDir = path.join(process.cwd(), "static", "fonts");
const fonts = {
  Roboto: {
    normal: path.join(fontsDir, "Roboto-Regular.ttf"),
    bold: path.join(fontsDir, "Roboto-Bold.ttf"),
    italics: path.join(fontsDir, "Roboto-Regular.ttf"),
    bolditalics: path.join(fontsDir, "Roboto-Bold.ttf"),
  },
};

const printer = new PdfPrinter(fonts);

export async function generatePdfReport(data: ReportData): Promise<Buffer> {
  // Grafikleri oluştur
  let vehicleChartBase64 = "";
  let callsChartBase64 = "";

  try {
    if (data.vehicles.length > 0) {
      const vehicleChart = await generateVehicleBarChart(data.vehicles);
      vehicleChartBase64 = vehicleChart.toString("base64");
    }
    if (data.summary.totalCalls > 0) {
      const callsChart = await generateCallsPieChart(data.summary);
      callsChartBase64 = callsChart.toString("base64");
    }
  } catch (e) {
    console.error("Chart generation error:", e);
  }

  const docDefinition: TDocumentDefinitions = {
    pageSize: "A4",
    pageMargins: [40, 60, 40, 60],

    header: {
      columns: [
        { text: "BUGGY SHUTTLE", style: "headerLeft", margin: [40, 20, 0, 0] },
        {
          text: formatDateTime(data.generatedAt),
          style: "headerRight",
          alignment: "right",
          margin: [0, 20, 40, 0],
        },
      ],
    },

    footer: (currentPage: number, pageCount: number) => ({
      columns: [
        {
          text: "Buggy Shuttle Fleet Management",
          style: "footerText",
          margin: [40, 0, 0, 0],
        },
        {
          text: `Sayfa ${currentPage} / ${pageCount}`,
          alignment: "right",
          style: "footerText",
          margin: [0, 0, 40, 0],
        },
      ],
      margin: [0, 20, 0, 0],
    }),

    content: buildPdfContent(data, vehicleChartBase64, callsChartBase64),

    styles: {
      headerLeft: { fontSize: 10, bold: true, color: "#0891b2" },
      headerRight: { fontSize: 9, color: "#64748b" },
      footerText: { fontSize: 8, color: "#94a3b8" },
      title: {
        fontSize: 24,
        bold: true,
        color: "#0891b2",
        alignment: "center",
      },
      subtitle: {
        fontSize: 12,
        color: "#64748b",
        alignment: "center",
        margin: [0, 5, 0, 20],
      },
      sectionTitle: {
        fontSize: 14,
        bold: true,
        color: "#1e293b",
        margin: [0, 20, 0, 10],
      },
      tableHeader: {
        bold: true,
        fontSize: 10,
        color: "white",
        fillColor: "#0891b2",
      },
      tableCell: { fontSize: 9, color: "#334155" },
      statLabel: { fontSize: 10, color: "#64748b" },
      statValue: { fontSize: 14, bold: true, color: "#0891b2" },
    },
  };

  return new Promise((resolve, reject) => {
    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    const chunks: Buffer[] = [];
    pdfDoc.on("data", (chunk) => chunks.push(chunk));
    pdfDoc.on("end", () => resolve(Buffer.concat(chunks)));
    pdfDoc.on("error", reject);
    pdfDoc.end();
  });
}

function buildPdfContent(
  data: ReportData,
  vehicleChart: string,
  callsChart: string
): Content[] {
  const content: Content[] = [];

  // Başlık
  content.push({ text: data.title.toUpperCase(), style: "title" });
  content.push({
    text: `${formatDate(data.dateRange.from)} - ${formatDate(
      data.dateRange.to
    )}`,
    style: "subtitle",
  });

  // Özet Kartları
  content.push({ text: "OZET ISTATISTIKLER", style: "sectionTitle" });
  content.push({
    columns: [
      buildStatCard("Toplam Arac", data.summary.totalVehicles.toString()),
      buildStatCard("Aktif Arac", data.summary.activeVehicles.toString()),
      buildStatCard("Toplam Seyahat", data.summary.totalTrips.toString()),
      buildStatCard("Toplam Mesafe", `${data.summary.totalDistance} km`),
    ],
    columnGap: 10,
    margin: [0, 0, 0, 10],
  });
  content.push({
    columns: [
      buildStatCard("Toplam Sure", `${data.summary.totalDuration} dk`),
      buildStatCard("Ort. Hiz", `${data.summary.avgSpeed} km/h`),
      buildStatCard("Toplam Cagri", data.summary.totalCalls.toString()),
      buildStatCard("Tamamlanan", data.summary.completedCalls.toString()),
    ],
    columnGap: 10,
    margin: [0, 0, 0, 20],
  });

  // Grafikler
  if (vehicleChart || callsChart) {
    content.push({ text: "GRAFIKLER", style: "sectionTitle" });
    const chartColumns: Content[] = [];

    if (vehicleChart) {
      chartColumns.push({
        image: `data:image/png;base64,${vehicleChart}`,
        width: 250,
        alignment: "center",
      });
    }
    if (callsChart) {
      chartColumns.push({
        image: `data:image/png;base64,${callsChart}`,
        width: 200,
        alignment: "center",
      });
    }

    if (chartColumns.length > 0) {
      content.push({
        columns: chartColumns,
        columnGap: 20,
        margin: [0, 0, 0, 20],
      });
    }
  }

  // Araç Performans Tablosu
  if (data.vehicles.length > 0) {
    content.push({ text: "ARAC PERFORMANSI", style: "sectionTitle" });
    content.push(buildVehicleTable(data.vehicles));
  }

  // Son Seyahatler
  if (data.trips.length > 0) {
    content.push({
      text: "SON SEYAHATLER",
      style: "sectionTitle",
      pageBreak: "before",
    });
    content.push(buildTripsTable(data.trips.slice(0, 15)));
  }

  // Çağrı Özeti
  if (data.calls.length > 0) {
    content.push({ text: "CAGRI OZETI", style: "sectionTitle" });
    content.push(buildCallsTable(data.calls.slice(0, 15)));
  }

  return content;
}

function buildStatCard(label: string, value: string): Content {
  return {
    stack: [
      { text: value, style: "statValue", alignment: "center" },
      { text: label, style: "statLabel", alignment: "center" },
    ],
    fillColor: "#f1f5f9",
    margin: [5, 10, 5, 10],
  };
}

function buildVehicleTable(vehicles: VehicleReportData[]): Content {
  const tableBody: TableCell[][] = [
    [
      { text: "Arac", style: "tableHeader" },
      { text: "Plaka", style: "tableHeader" },
      { text: "Seyahat", style: "tableHeader" },
      { text: "Mesafe (km)", style: "tableHeader" },
      { text: "Sure (dk)", style: "tableHeader" },
      { text: "Ort. Hiz", style: "tableHeader" },
    ],
  ];

  vehicles.slice(0, 10).forEach((v, i) => {
    tableBody.push([
      {
        text: v.name,
        style: "tableCell",
        fillColor: i % 2 === 0 ? "#f8fafc" : "white",
      },
      {
        text: v.plateNumber,
        style: "tableCell",
        fillColor: i % 2 === 0 ? "#f8fafc" : "white",
      },
      {
        text: v.tripCount.toString(),
        style: "tableCell",
        fillColor: i % 2 === 0 ? "#f8fafc" : "white",
      },
      {
        text: v.totalDistance.toString(),
        style: "tableCell",
        fillColor: i % 2 === 0 ? "#f8fafc" : "white",
      },
      {
        text: v.totalDuration.toString(),
        style: "tableCell",
        fillColor: i % 2 === 0 ? "#f8fafc" : "white",
      },
      {
        text: `${v.avgSpeed} km/h`,
        style: "tableCell",
        fillColor: i % 2 === 0 ? "#f8fafc" : "white",
      },
    ]);
  });

  return {
    table: {
      headerRows: 1,
      widths: ["*", "auto", "auto", "auto", "auto", "auto"],
      body: tableBody,
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => "#e2e8f0",
      vLineColor: () => "#e2e8f0",
    },
    margin: [0, 0, 0, 15],
  };
}

function buildTripsTable(trips: TripReportData[]): Content {
  const tableBody: TableCell[][] = [
    [
      { text: "Arac", style: "tableHeader" },
      { text: "Baslangic", style: "tableHeader" },
      { text: "Sure", style: "tableHeader" },
      { text: "Mesafe", style: "tableHeader" },
      { text: "Hiz", style: "tableHeader" },
    ],
  ];

  trips.forEach((t, i) => {
    tableBody.push([
      {
        text: t.vehicleName,
        style: "tableCell",
        fillColor: i % 2 === 0 ? "#f8fafc" : "white",
      },
      {
        text: formatDateTime(t.startTime),
        style: "tableCell",
        fillColor: i % 2 === 0 ? "#f8fafc" : "white",
      },
      {
        text: `${t.duration} dk`,
        style: "tableCell",
        fillColor: i % 2 === 0 ? "#f8fafc" : "white",
      },
      {
        text: `${t.distance} km`,
        style: "tableCell",
        fillColor: i % 2 === 0 ? "#f8fafc" : "white",
      },
      {
        text: `${t.avgSpeed} km/h`,
        style: "tableCell",
        fillColor: i % 2 === 0 ? "#f8fafc" : "white",
      },
    ]);
  });

  return {
    table: {
      headerRows: 1,
      widths: ["*", "auto", "auto", "auto", "auto"],
      body: tableBody,
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => "#e2e8f0",
      vLineColor: () => "#e2e8f0",
    },
    margin: [0, 0, 0, 15],
  };
}

function buildCallsTable(calls: CallReportData[]): Content {
  const statusMap: Record<string, string> = {
    pending: "Bekliyor",
    assigned: "Atandi",
    completed: "Tamamlandi",
    cancelled: "Iptal",
  };

  const tableBody: TableCell[][] = [
    [
      { text: "Durak", style: "tableHeader" },
      { text: "Durum", style: "tableHeader" },
      { text: "Arac", style: "tableHeader" },
      { text: "Tarih", style: "tableHeader" },
      { text: "Bekleme", style: "tableHeader" },
    ],
  ];

  calls.forEach((c, i) => {
    tableBody.push([
      {
        text: c.stopName,
        style: "tableCell",
        fillColor: i % 2 === 0 ? "#f8fafc" : "white",
      },
      {
        text: statusMap[c.status] || c.status,
        style: "tableCell",
        fillColor: i % 2 === 0 ? "#f8fafc" : "white",
      },
      {
        text: c.vehicleName || "-",
        style: "tableCell",
        fillColor: i % 2 === 0 ? "#f8fafc" : "white",
      },
      {
        text: formatDateTime(c.createdAt),
        style: "tableCell",
        fillColor: i % 2 === 0 ? "#f8fafc" : "white",
      },
      {
        text: c.waitTime ? `${c.waitTime} dk` : "-",
        style: "tableCell",
        fillColor: i % 2 === 0 ? "#f8fafc" : "white",
      },
    ]);
  });

  return {
    table: {
      headerRows: 1,
      widths: ["*", "auto", "auto", "auto", "auto"],
      body: tableBody,
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => "#e2e8f0",
      vLineColor: () => "#e2e8f0",
    },
    margin: [0, 0, 0, 15],
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("tr-TR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatDateTime(date: Date): string {
  return new Date(date).toLocaleString("tr-TR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ============================================================================
// REPORT GENERATION & STORAGE
// ============================================================================

const REPORTS_DIR = "./static/reports";

export async function saveReportFile(
  buffer: Buffer,
  filename: string
): Promise<string> {
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }
  const filePath = path.join(REPORTS_DIR, filename);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

export async function createReport(
  name: string,
  type: "daily" | "weekly" | "monthly" | "custom" | "vehicle" | "trip",
  format: "pdf" | "excel",
  from: Date,
  to: Date,
  vehicleId?: number,
  scheduledReportId?: number
): Promise<{ reportId: number; filePath: string; fileSize: number }> {
  const data = await collectReportData(from, to, vehicleId);

  let buffer: Buffer;
  let extension: string;

  if (format === "excel") {
    buffer = await generateExcelReport(data);
    extension = "xlsx";
  } else {
    buffer = await generatePdfReport(data);
    extension = "pdf";
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `${type}_${timestamp}.${extension}`;
  const filePath = await saveReportFile(buffer, filename);
  const fileSize = buffer.length;

  const [report] = await db
    .insert(schema.reports)
    .values({
      name,
      type,
      format,
      dateFrom: from,
      dateTo: to,
      vehicleId,
      filePath,
      fileSize,
      generatedAt: new Date(),
      scheduledReportId,
    })
    .returning();

  return { reportId: report.id, filePath, fileSize };
}

export async function getReports(limit = 50): Promise<schema.Report[]> {
  return db
    .select()
    .from(schema.reports)
    .orderBy(desc(schema.reports.createdAt))
    .limit(limit);
}

export async function deleteReport(reportId: number): Promise<boolean> {
  const [report] = await db
    .select()
    .from(schema.reports)
    .where(eq(schema.reports.id, reportId));
  if (!report) return false;

  if (report.filePath && fs.existsSync(report.filePath)) {
    fs.unlinkSync(report.filePath);
  }

  await db.delete(schema.reports).where(eq(schema.reports.id, reportId));
  return true;
}
