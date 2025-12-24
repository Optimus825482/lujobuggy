<script lang="ts">
  import { onMount } from 'svelte';
  
  interface DailyStats {
    date: string;
    totalCalls: number;
    completedCalls: number;
    cancelledCalls: number;
    averageWaitTime: number;
    peakHour: number;
    busiestStop: string;
  }
  
  let stats = $state<DailyStats[]>([]);
  let loading = $state(true);
  let dateRange = $state<'today' | 'week' | 'month'>('week');
  
  // Summary stats
  let summary = $derived({
    totalCalls: stats.reduce((a, s) => a + s.totalCalls, 0),
    completed: stats.reduce((a, s) => a + s.completedCalls, 0),
    cancelled: stats.reduce((a, s) => a + s.cancelledCalls, 0),
    avgWait: Math.round(stats.reduce((a, s) => a + s.averageWaitTime, 0) / Math.max(stats.length, 1))
  });
  
  async function fetchStats() {
    loading = true;
    try {
      const res = await fetch(`/api/stats?range=${dateRange}`);
      if (res.ok) {
        const data = await res.json();
        stats = data.data || generateMockStats();
      } else {
        stats = generateMockStats();
      }
    } catch {
      stats = generateMockStats();
    } finally {
      loading = false;
    }
  }
  
  function generateMockStats(): DailyStats[] {
    const days = dateRange === 'today' ? 1 : dateRange === 'week' ? 7 : 30;
    return Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
      return {
        date: date.toISOString().split('T')[0],
        totalCalls: Math.floor(Math.random() * 50) + 20,
        completedCalls: Math.floor(Math.random() * 40) + 15,
        cancelledCalls: Math.floor(Math.random() * 5),
        averageWaitTime: Math.floor(Math.random() * 120) + 60,
        peakHour: Math.floor(Math.random() * 12) + 8,
        busiestStop: 'Ana Lobi'
      };
    });
  }
  
  $effect(() => {
    fetchStats();
  });
  
  onMount(() => {
    fetchStats();
  });
</script>

<div class="p-6">
  <div class="flex items-center justify-between mb-6">
    <div>
      <h1 class="text-2xl font-bold">📈 Raporlar & Analiz</h1>
      <p class="text-dark-400 text-sm mt-1">Shuttle operasyonlarının detaylı analizi</p>
    </div>
    <div class="flex gap-2">
      {#each [['today', 'Bugün'], ['week', 'Hafta'], ['month', 'Ay']] as [key, label]}
        <button onclick={() => dateRange = key as typeof dateRange}
          class="px-4 py-2 rounded-lg text-sm font-medium transition-all {dateRange === key ? 'bg-primary-500 text-white' : 'bg-dark-800 text-dark-400 hover:text-white'}">
          {label}
        </button>
      {/each}
    </div>
  </div>

  <!-- Summary Cards -->
  <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
    <div class="bg-gradient-to-br from-primary-500/20 to-primary-600/10 rounded-xl p-6 border border-primary-500/30">
      <div class="text-primary-400 text-sm font-medium">Toplam Çağrı</div>
      <div class="text-4xl font-bold mt-2">{summary.totalCalls}</div>
      <div class="text-xs text-dark-400 mt-1">Son {dateRange === 'today' ? 'gün' : dateRange === 'week' ? '7 gün' : '30 gün'}</div>
    </div>
    <div class="bg-gradient-to-br from-green-500/20 to-green-600/10 rounded-xl p-6 border border-green-500/30">
      <div class="text-green-400 text-sm font-medium">Tamamlanan</div>
      <div class="text-4xl font-bold mt-2">{summary.completed}</div>
      <div class="text-xs text-dark-400 mt-1">%{summary.totalCalls ? Math.round(summary.completed / summary.totalCalls * 100) : 0} başarı</div>
    </div>
    <div class="bg-gradient-to-br from-red-500/20 to-red-600/10 rounded-xl p-6 border border-red-500/30">
      <div class="text-red-400 text-sm font-medium">İptal Edilen</div>
      <div class="text-4xl font-bold mt-2">{summary.cancelled}</div>
      <div class="text-xs text-dark-400 mt-1">%{summary.totalCalls ? Math.round(summary.cancelled / summary.totalCalls * 100) : 0} iptal</div>
    </div>
    <div class="bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 rounded-xl p-6 border border-yellow-500/30">
      <div class="text-yellow-400 text-sm font-medium">Ort. Bekleme</div>
      <div class="text-4xl font-bold mt-2">{summary.avgWait}s</div>
      <div class="text-xs text-dark-400 mt-1">Ortalama süre</div>
    </div>
  </div>
  
  <!-- Charts Section -->
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
    <!-- Daily Calls Chart -->
    <div class="bg-dark-800 rounded-xl p-6 border border-dark-700">
      <h3 class="text-lg font-semibold mb-4">📊 Günlük Çağrı Trendi</h3>
      <div class="h-64 flex items-end gap-2">
        {#each stats as day, i}
          {@const maxCalls = Math.max(...stats.map(s => s.totalCalls), 1)}
          {@const height = (day.totalCalls / maxCalls) * 100}
          <div class="flex-1 flex flex-col items-center gap-2">
            <div class="w-full bg-primary-500/30 rounded-t relative" style="height: {height}%">
              <div class="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-dark-400">{day.totalCalls}</div>
            </div>
            <span class="text-xs text-dark-500">{new Date(day.date).toLocaleDateString('tr-TR', { weekday: 'short' })}</span>
          </div>
        {/each}
        {#if stats.length === 0}
          <div class="flex-1 flex items-center justify-center text-dark-500">Veri yok</div>
        {/if}
      </div>
    </div>
    
    <!-- Peak Hours -->
    <div class="bg-dark-800 rounded-xl p-6 border border-dark-700">
      <h3 class="text-lg font-semibold mb-4">⏰ Yoğun Saatler</h3>
      <div class="space-y-3">
        {#each [
          { hour: '08:00-10:00', label: 'Sabah', percent: 35, color: 'bg-yellow-500' },
          { hour: '12:00-14:00', label: 'Öğle', percent: 25, color: 'bg-orange-500' },
          { hour: '18:00-20:00', label: 'Akşam', percent: 40, color: 'bg-red-500' },
          { hour: '20:00-22:00', label: 'Gece', percent: 20, color: 'bg-purple-500' }
        ] as slot}
          <div>
            <div class="flex justify-between text-sm mb-1">
              <span class="text-dark-300">{slot.hour} <span class="text-dark-500">({slot.label})</span></span>
              <span class="text-dark-400">%{slot.percent}</span>
            </div>
            <div class="h-2 bg-dark-700 rounded-full overflow-hidden">
              <div class="{slot.color} h-full rounded-full transition-all" style="width: {slot.percent}%"></div>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>

  <!-- Vehicle Performance & Stop Stats -->
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <!-- Vehicle Performance -->
    <div class="bg-dark-800 rounded-xl p-6 border border-dark-700">
      <h3 class="text-lg font-semibold mb-4">🚐 Araç Performansı</h3>
      <div class="space-y-4">
        {#each [
          { name: 'Buggy-01', trips: 45, avgTime: 180, rating: 4.8 },
          { name: 'Buggy-02', trips: 42, avgTime: 195, rating: 4.6 },
          { name: 'Buggy-03', trips: 38, avgTime: 210, rating: 4.5 },
          { name: 'Buggy-04', trips: 35, avgTime: 185, rating: 4.7 }
        ] as vehicle}
          <div class="flex items-center gap-4 p-3 bg-dark-700/50 rounded-lg">
            <div class="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center">🚐</div>
            <div class="flex-1">
              <div class="font-medium">{vehicle.name}</div>
              <div class="text-xs text-dark-400">{vehicle.trips} sefer • Ort. {Math.round(vehicle.avgTime / 60)}dk</div>
            </div>
            <div class="text-right">
              <div class="text-yellow-400 text-sm">⭐ {vehicle.rating}</div>
            </div>
          </div>
        {/each}
      </div>
    </div>
    
    <!-- Top Stops -->
    <div class="bg-dark-800 rounded-xl p-6 border border-dark-700">
      <h3 class="text-lg font-semibold mb-4">📍 En Yoğun Duraklar</h3>
      <div class="space-y-4">
        {#each [
          { name: 'Ana Lobi', icon: '🏨', calls: 156, percent: 100 },
          { name: 'Beach Club', icon: '🏖️', calls: 124, percent: 79 },
          { name: 'Spa & Wellness', icon: '🧖', calls: 98, percent: 63 },
          { name: 'Aqua Park', icon: '🏊', calls: 87, percent: 56 },
          { name: 'Restoran', icon: '🍽️', calls: 76, percent: 49 }
        ] as stop}
          <div class="flex items-center gap-4">
            <div class="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center text-xl">{stop.icon}</div>
            <div class="flex-1">
              <div class="flex justify-between mb-1">
                <span class="font-medium">{stop.name}</span>
                <span class="text-dark-400 text-sm">{stop.calls} çağrı</span>
              </div>
              <div class="h-2 bg-dark-700 rounded-full overflow-hidden">
                <div class="bg-primary-500 h-full rounded-full" style="width: {stop.percent}%"></div>
              </div>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>
</div>

<script context="module">
</script>
