<script lang="ts">
  import { onMount } from 'svelte';

  interface StopVisit {
    id: number;
    vehicleId: number;
    vehicleName: string;
    vehiclePlate: string;
    stopId: number;
    stopName: string;
    stopIcon: string;
    enterTime: string;
    exitTime: string | null;
    duration: number | null;
  }

  interface StopStat {
    stopId: number;
    stopName: string;
    stopIcon: string;
    visitCount: number;
    uniqueVehicles: number;
    totalDuration: number;
    avgDuration: number;
  }

  interface VehicleStat {
    stopId: number;
    stopName: string;
    stopIcon: string;
    visitCount: number;
    totalDuration: number;
    avgDuration: number;
    lastVisit: string | null;
  }

  interface Vehicle {
    id: number;
    name: string;
    plateNumber: string;
  }

  let loading = $state(true);
  let visits = $state<StopVisit[]>([]);
  let stopStats = $state<StopStat[]>([]);
  let vehicleStats = $state<VehicleStat[]>([]);
  let vehicles = $state<Vehicle[]>([]);
  
  let activeTab = $state<'visits' | 'stopStats' | 'vehicleStats'>('visits');
  let selectedVehicleId = $state<number | null>(null);
  let dateFrom = $state(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  let dateTo = $state(new Date().toISOString().split('T')[0]);

  onMount(() => {
    fetchVehicles();
    fetchData();
  });

  async function fetchVehicles() {
    const res = await fetch('/api/vehicles');
    const data = await res.json();
    if (data.success) vehicles = data.data;
  }

  async function fetchData() {
    loading = true;
    try {
      const params = new URLSearchParams({
        from: dateFrom,
        to: dateTo + 'T23:59:59',
        limit: '500'
      });

      if (selectedVehicleId) {
        params.set('vehicleId', selectedVehicleId.toString());
      }

      // Ziyaretleri çek
      const visitsRes = await fetch(`/api/stop-visits?${params}`);
      const visitsData = await visitsRes.json();
      if (visitsData.success) visits = visitsData.data;

      // Durak istatistiklerini çek
      const statsParams = new URLSearchParams({
        from: dateFrom,
        to: dateTo + 'T23:59:59',
        stats: 'true'
      });
      const statsRes = await fetch(`/api/stop-visits?${statsParams}`);
      const statsData = await statsRes.json();
      if (statsData.success) stopStats = statsData.data;

      // Araç bazlı istatistikler
      if (selectedVehicleId) {
        statsParams.set('vehicleId', selectedVehicleId.toString());
        const vStatsRes = await fetch(`/api/stop-visits?${statsParams}`);
        const vStatsData = await vStatsRes.json();
        if (vStatsData.success) vehicleStats = vStatsData.data;
      }
    } catch (err) {
      console.error('Veri yüklenirken hata:', err);
    } finally {
      loading = false;
    }
  }

  function formatDateTime(dateStr: string): string {
    return new Date(dateStr).toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatDuration(seconds: number | null): string {
    if (!seconds) return '-';
    if (seconds < 60) return `${seconds} sn`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} dk`;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours} sa ${mins} dk`;
  }
</script>

<svelte:head>
  <title>Durak Etkinlikleri | Buggy Shuttle</title>
</svelte:head>

<div class="min-h-screen bg-slate-900 text-white p-6">
  <div class="max-w-7xl mx-auto">
    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-bold">📍 Durak Etkinlikleri</h1>
        <p class="text-slate-400 text-sm mt-1">Araçların duraklara giriş/çıkış kayıtları</p>
      </div>
      <a href="/" class="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition-colors">
        ← Ana Sayfa
      </a>
    </div>

    <!-- Filters -->
    <div class="bg-slate-800 rounded-xl border border-slate-700 p-4 mb-6">
      <div class="flex flex-wrap gap-4 items-end">
        <div>
          <label for="vehicle-select" class="block text-sm text-slate-400 mb-1">Araç</label>
          <select 
            id="vehicle-select"
            bind:value={selectedVehicleId} 
            onchange={fetchData}
            class="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
          >
            <option value={null}>Tüm Araçlar</option>
            {#each vehicles as v}
              <option value={v.id}>{v.name} ({v.plateNumber})</option>
            {/each}
          </select>
        </div>
        <div>
          <label for="date-from" class="block text-sm text-slate-400 mb-1">Başlangıç</label>
          <input 
            id="date-from"
            type="date" 
            bind:value={dateFrom}
            onchange={fetchData}
            class="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
          />
        </div>
        <div>
          <label for="date-to" class="block text-sm text-slate-400 mb-1">Bitiş</label>
          <input 
            id="date-to"
            type="date" 
            bind:value={dateTo}
            onchange={fetchData}
            class="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
          />
        </div>
        <button 
          onclick={fetchData}
          class="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-sm font-medium transition-colors"
        >
          🔄 Yenile
        </button>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex gap-2 mb-6">
      <button
        onclick={() => activeTab = 'visits'}
        class="px-4 py-2 rounded-lg text-sm font-medium transition-colors {activeTab === 'visits' ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}"
      >
        📋 Ziyaret Listesi ({visits.length})
      </button>
      <button
        onclick={() => activeTab = 'stopStats'}
        class="px-4 py-2 rounded-lg text-sm font-medium transition-colors {activeTab === 'stopStats' ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}"
      >
        📊 Durak İstatistikleri
      </button>
      {#if selectedVehicleId}
        <button
          onclick={() => activeTab = 'vehicleStats'}
          class="px-4 py-2 rounded-lg text-sm font-medium transition-colors {activeTab === 'vehicleStats' ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}"
        >
          🚐 Araç Durak Özeti
        </button>
      {/if}
    </div>

    {#if loading}
      <div class="flex items-center justify-center py-20">
        <div class="animate-spin w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full"></div>
        <span class="ml-3 text-slate-400">Yükleniyor...</span>
      </div>
    {:else}

      <!-- Visits List -->
      {#if activeTab === 'visits'}
        <div class="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <div class="px-6 py-4 border-b border-slate-700">
            <h2 class="text-lg font-semibold">Durak Ziyaretleri</h2>
          </div>

          {#if visits.length === 0}
            <div class="p-8 text-center text-slate-500">
              Bu tarih aralığında ziyaret kaydı bulunamadı
            </div>
          {:else}
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead class="bg-slate-700/50">
                  <tr>
                    <th class="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Araç</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Durak</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Giriş</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Çıkış</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Süre</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-700">
                  {#each visits as visit}
                    <tr class="hover:bg-slate-700/30 transition-colors">
                      <td class="px-4 py-3">
                        <div class="font-medium">{visit.vehicleName}</div>
                        <div class="text-xs text-slate-500">{visit.vehiclePlate}</div>
                      </td>
                      <td class="px-4 py-3">
                        <span class="mr-1">{visit.stopIcon}</span>
                        {visit.stopName}
                      </td>
                      <td class="px-4 py-3 text-sm text-slate-300">
                        {formatDateTime(visit.enterTime)}
                      </td>
                      <td class="px-4 py-3 text-sm text-slate-300">
                        {visit.exitTime ? formatDateTime(visit.exitTime) : '—'}
                      </td>
                      <td class="px-4 py-3">
                        <span class="px-2 py-1 bg-slate-700 rounded text-sm">
                          {formatDuration(visit.duration)}
                        </span>
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {/if}
        </div>
      {/if}

      <!-- Stop Statistics -->
      {#if activeTab === 'stopStats'}
        <div class="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <div class="px-6 py-4 border-b border-slate-700">
            <h2 class="text-lg font-semibold">Durak İstatistikleri</h2>
          </div>

          {#if stopStats.length === 0}
            <div class="p-8 text-center text-slate-500">
              İstatistik verisi bulunamadı
            </div>
          {:else}
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
              {#each stopStats as stat}
                <div class="bg-slate-700/50 rounded-lg p-4">
                  <div class="flex items-center gap-3 mb-3">
                    <span class="text-2xl">{stat.stopIcon}</span>
                    <div>
                      <div class="font-medium">{stat.stopName}</div>
                      <div class="text-xs text-slate-400">{stat.visitCount} ziyaret</div>
                    </div>
                  </div>
                  <div class="grid grid-cols-2 gap-2 text-sm">
                    <div class="bg-slate-800 rounded p-2">
                      <div class="text-slate-400 text-xs">Farklı Araç</div>
                      <div class="font-bold text-cyan-400">{stat.uniqueVehicles}</div>
                    </div>
                    <div class="bg-slate-800 rounded p-2">
                      <div class="text-slate-400 text-xs">Ort. Süre</div>
                      <div class="font-bold text-green-400">{formatDuration(stat.avgDuration)}</div>
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/if}

      <!-- Vehicle Stop Statistics -->
      {#if activeTab === 'vehicleStats' && selectedVehicleId}
        <div class="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <div class="px-6 py-4 border-b border-slate-700">
            <h2 class="text-lg font-semibold">Araç Durak Özeti</h2>
          </div>

          {#if vehicleStats.length === 0}
            <div class="p-8 text-center text-slate-500">
              Bu araç için durak verisi bulunamadı
            </div>
          {:else}
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead class="bg-slate-700/50">
                  <tr>
                    <th class="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Durak</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Ziyaret</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Toplam Süre</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Ort. Süre</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Son Ziyaret</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-700">
                  {#each vehicleStats as stat}
                    <tr class="hover:bg-slate-700/30 transition-colors">
                      <td class="px-4 py-3">
                        <span class="mr-1">{stat.stopIcon}</span>
                        {stat.stopName}
                      </td>
                      <td class="px-4 py-3">
                        <span class="px-2 py-1 bg-cyan-600/20 text-cyan-400 rounded text-sm font-medium">
                          {stat.visitCount}
                        </span>
                      </td>
                      <td class="px-4 py-3 text-sm">{formatDuration(stat.totalDuration)}</td>
                      <td class="px-4 py-3 text-sm">{formatDuration(stat.avgDuration)}</td>
                      <td class="px-4 py-3 text-sm text-slate-400">
                        {stat.lastVisit ? formatDateTime(stat.lastVisit) : '-'}
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {/if}
        </div>
      {/if}

    {/if}
  </div>
</div>
