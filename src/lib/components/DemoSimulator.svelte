<script lang="ts">
  import { appStore } from '$lib/stores/app.svelte';

  // Props - parent'tan gelen veriler
  let { 
    vehicles = [], 
    stops = [], 
    calls = [],
    onRefresh = () => {}
  }: { 
    vehicles: any[], 
    stops: any[], 
    calls: any[],
    onRefresh: () => void 
  } = $props();

  // Simülasyon state
  let isExpanded = $state(false);
  let activeSimulations = $state<Map<number, { targetStop: any, interval: ReturnType<typeof setInterval> }>>(new Map());
  let selectedCallId = $state<number | null>(null);
  let selectedVehicleId = $state<number | null>(null);
  let selectedDropoffId = $state<number | null>(null);

  // Müsait araçlar
  let availableVehicles = $derived(vehicles.filter(v => v.status === 'available'));
  
  // Bekleyen çağrılar
  let pendingCalls = $derived(calls.filter(c => c.status === 'pending'));

  // Rastgele çağrı oluştur
  async function createRandomCall() {
    const randomStop = stops[Math.floor(Math.random() * stops.length)];
    if (!randomStop) return;
    
    try {
      const res = await fetch('/api/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stopId: randomStop.id })
      });
      const data = await res.json();
      if (data.success) {
        appStore.addNotification('info', 'Yeni Çağrı', `${randomStop.icon} ${randomStop.name} durağından çağrı geldi`);
        onRefresh();
      }
    } catch (err) {
      console.error('Çağrı oluşturma hatası:', err);
    }
  }

  // Çağrıya araç ata
  async function assignVehicleToCall() {
    if (!selectedCallId || !selectedVehicleId) return;
    
    const call = calls.find(c => c.id === selectedCallId);
    const vehicle = vehicles.find(v => v.id === selectedVehicleId);
    if (!call || !vehicle) return;

    try {
      // Task oluştur
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleId: selectedVehicleId,
          callId: selectedCallId,
          pickupStopId: call.stopId
        })
      });
      const data = await res.json();
      
      if (data.success) {
        appStore.addNotification('success', 'Araç Gönderildi', `${vehicle.name} → ${call.stop?.name || 'Durak'}`);
        
        // Simülasyonu başlat - araç pickup noktasına gitsin
        startVehicleSimulation(selectedVehicleId, call.stop);
        
        selectedCallId = null;
        selectedVehicleId = null;
        onRefresh();
      }
    } catch (err) {
      console.error('Araç gönderme hatası:', err);
    }
  }

  // Hedef durak belirle (dropoff)
  async function setDropoffStop() {
    if (!selectedDropoffId) return;
    
    // Aktif görevi olan aracı bul
    const busyVehicle = vehicles.find(v => v.status === 'busy');
    if (!busyVehicle) {
      appStore.addNotification('warning', 'Uyarı', 'Aktif görevi olan araç yok');
      return;
    }

    const dropoffStop = stops.find(s => s.id === selectedDropoffId);
    if (!dropoffStop) return;

    try {
      // Task'ı güncelle
      const tasksRes = await fetch('/api/tasks?status=pickup');
      const tasksData = await tasksRes.json();
      
      if (tasksData.success && tasksData.data.tasks?.length > 0) {
        const activeTask = tasksData.data.tasks.find((t: any) => t.vehicleId === busyVehicle.id);
        if (activeTask) {
          await fetch(`/api/tasks/${activeTask.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dropoffStopId: selectedDropoffId })
          });
          
          appStore.addNotification('info', 'Hedef Belirlendi', `${busyVehicle.name} → ${dropoffStop.name}`);
          
          // Simülasyonu dropoff'a yönlendir
          startVehicleSimulation(busyVehicle.id, dropoffStop);
        }
      }
      
      selectedDropoffId = null;
      onRefresh();
    } catch (err) {
      console.error('Hedef belirleme hatası:', err);
    }
  }

  // Araç simülasyonu başlat
  function startVehicleSimulation(vehicleId: number, targetStop: any) {
    // Önceki simülasyonu durdur
    if (activeSimulations.has(vehicleId)) {
      clearInterval(activeSimulations.get(vehicleId)!.interval);
    }

    const interval = setInterval(async () => {
      const vehicle = vehicles.find(v => v.id === vehicleId);
      if (!vehicle || !targetStop) {
        clearInterval(interval);
        activeSimulations.delete(vehicleId);
        return;
      }

      const dx = targetStop.lng - vehicle.lng;
      const dy = targetStop.lat - vehicle.lat;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Geofence mesafesi (yaklaşık 20m)
      if (distance < 0.0002) {
        clearInterval(interval);
        activeSimulations.delete(vehicleId);
        
        // Geofence tetikle
        await triggerGeofence(vehicleId, targetStop.id);
        return;
      }

      // Hareket et
      const speed = 0.00012; // Hız
      const newLat = vehicle.lat + (dy / distance) * speed;
      const newLng = vehicle.lng + (dx / distance) * speed;
      const heading = Math.atan2(dx, dy) * (180 / Math.PI);

      // Pozisyonu güncelle
      await fetch(`/api/vehicles/${vehicleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: newLat,
          lng: newLng,
          speed: 12 + Math.random() * 8,
          heading: heading
        })
      });

      onRefresh();
    }, 800);

    activeSimulations.set(vehicleId, { targetStop, interval });
  }

  // Geofence tetikle
  async function triggerGeofence(vehicleId: number, stopId: number) {
    try {
      // Aracın mevcut konumunu al (stop'a ulaştığı için stop koordinatlarını kullan)
      const stop = stops.find(s => s.id === stopId);
      if (!stop) {
        console.error('Stop bulunamadı:', stopId);
        return;
      }
      
      const res = await fetch('/api/geofence/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicleId, lat: stop.lat, lng: stop.lng })
      });
      const data = await res.json();
      
      if (data.success) {
        const vehicle = vehicles.find(v => v.id === vehicleId);
        appStore.addNotification('success', 'Görev Tamamlandı', `${vehicle?.name} ${stop.name} durağına ulaştı`);
      }
      
      onRefresh();
    } catch (err) {
      console.error('Geofence hatası:', err);
    }
  }

  // Tüm simülasyonları durdur
  function stopAllSimulations() {
    activeSimulations.forEach(sim => clearInterval(sim.interval));
    activeSimulations.clear();
    appStore.addNotification('info', 'Simülasyon', 'Tüm simülasyonlar durduruldu');
  }

  // Cleanup
  $effect(() => {
    return () => {
      activeSimulations.forEach(sim => clearInterval(sim.interval));
    };
  });
</script>

<div class="bg-slate-800/95 backdrop-blur rounded-xl border border-slate-700 shadow-2xl overflow-hidden w-80">
  <!-- Header -->
  <button 
    onclick={() => isExpanded = !isExpanded}
    class="w-full px-4 py-3 flex items-center justify-between bg-yellow-500/10 border-b border-slate-700 hover:bg-yellow-500/20 transition-colors"
  >
    <div class="flex items-center gap-2">
      <span class="text-lg">🎮</span>
      <span class="text-sm font-bold text-yellow-400">SİMÜLASYON</span>
    </div>
    <span class="text-slate-400 text-xs">{isExpanded ? '▼' : '▶'}</span>
  </button>

  {#if isExpanded}
    <div class="p-4 space-y-4">
      <!-- Çağrı Oluştur -->
      <div>
        <button 
          onclick={createRandomCall}
          class="w-full px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
        >
          📞 Rastgele Çağrı Oluştur
        </button>
      </div>

      <!-- Bekleyen Çağrılar -->
      {#if pendingCalls.length > 0}
        <div>
          <p class="text-xs text-slate-400 mb-2">📋 Bekleyen Çağrılar ({pendingCalls.length})</p>
          <div class="space-y-1 max-h-24 overflow-y-auto">
            {#each pendingCalls as call}
              <button 
                onclick={() => selectedCallId = selectedCallId === call.id ? null : call.id}
                class="w-full px-3 py-2 rounded-lg text-left text-xs transition-colors {selectedCallId === call.id ? 'bg-red-500/30 border border-red-500' : 'bg-slate-700/50 hover:bg-slate-700'}"
              >
                <span class="text-white">{call.stop?.icon} {call.stop?.name}</span>
              </button>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Araç Seç -->
      {#if selectedCallId && availableVehicles.length > 0}
        <div>
          <p class="text-xs text-slate-400 mb-2">🚐 Araç Seç</p>
          <div class="space-y-1">
            {#each availableVehicles as vehicle}
              <button 
                onclick={() => selectedVehicleId = selectedVehicleId === vehicle.id ? null : vehicle.id}
                class="w-full px-3 py-2 rounded-lg text-left text-xs transition-colors {selectedVehicleId === vehicle.id ? 'bg-green-500/30 border border-green-500' : 'bg-slate-700/50 hover:bg-slate-700'}"
              >
                <span class="text-white">🚐 {vehicle.name}</span>
                <span class="text-green-400 ml-2">Müsait</span>
              </button>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Araç Gönder Butonu -->
      {#if selectedCallId && selectedVehicleId}
        <button 
          onclick={assignVehicleToCall}
          class="w-full px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors"
        >
          🚐 Araç Gönder
        </button>
      {/if}

      <!-- Hedef Durak Belirle -->
      {#if vehicles.some(v => v.status === 'busy')}
        <div class="border-t border-slate-700 pt-4">
          <p class="text-xs text-slate-400 mb-2">🎯 Hedef Durak Belirle</p>
          <select 
            bind:value={selectedDropoffId}
            class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-xs"
          >
            <option value={null}>Durak seçin...</option>
            {#each stops as stop}
              <option value={stop.id}>{stop.icon} {stop.name}</option>
            {/each}
          </select>
          {#if selectedDropoffId}
            <button 
              onclick={setDropoffStop}
              class="w-full mt-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              🚀 Hedefe Gönder
            </button>
          {/if}
        </div>
      {/if}

      <!-- Aktif Simülasyonlar -->
      {#if activeSimulations.size > 0}
        <div class="border-t border-slate-700 pt-4">
          <div class="flex items-center justify-between mb-2">
            <p class="text-xs text-slate-400">🔄 Aktif Simülasyonlar ({activeSimulations.size})</p>
            <button 
              onclick={stopAllSimulations}
              class="text-xs text-red-400 hover:text-red-300"
            >
              Durdur
            </button>
          </div>
          <div class="flex gap-1">
            {#each vehicles.filter(v => activeSimulations.has(v.id)) as vehicle}
              <div class="px-2 py-1 bg-yellow-500/20 rounded text-xs text-yellow-400">
                🚐 {vehicle.name}
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  {:else}
    <div class="px-4 py-2 text-xs text-slate-500">
      Simülasyonu başlatmak için tıklayın
    </div>
  {/if}
</div>
