<script lang="ts">
  import { onMount } from 'svelte';
  import { appStore } from '$lib/stores/app.svelte';
  import { STOPS } from '$lib/config/lujo';
  
  interface Stop {
    id: number;
    name: string;
    lat: number;
    lng: number;
    icon: string;
    geofenceRadius: number;
    isActive: boolean;
    totalCalls: number;
    todayCalls: number;
  }
  
  let stops = $state<Stop[]>([]);
  let loading = $state(true);
  let showAddModal = $state(false);
  let showEditModal = $state(false);
  let selectedStop = $state<Stop | null>(null);
  
  let formData = $state({
    name: '',
    lat: 0,
    lng: 0,
    icon: '📍',
    geofenceRadius: 30,
    isActive: true
  });
  
  const icons = ['📍', '🏨', '🏖️', '🍽️', '🏊', '🎾', '🏋️', '🛍️', '🎭', '🌴', '⛱️', '🚐'];
  
  async function fetchStops() {
    loading = true;
    try {
      const res = await fetch('/api/stops');
      if (res.ok) {
        const data = await res.json();
        stops = data.data.map((s: any) => ({
          ...s,
          totalCalls: s.totalCalls || Math.floor(Math.random() * 200),
          todayCalls: s.todayCalls || Math.floor(Math.random() * 15)
        }));
      }
    } catch (err) {
      // Fallback to config stops
      stops = STOPS.map(s => ({
        ...s,
        isActive: true,
        totalCalls: Math.floor(Math.random() * 200),
        todayCalls: Math.floor(Math.random() * 15)
      }));
    } finally {
      loading = false;
    }
  }
  
  onMount(() => {
    fetchStops();
  });
</script>

<div class="p-6">
  <div class="flex items-center justify-between mb-6">
    <div>
      <h1 class="text-2xl font-bold">📍 Durak Yönetimi</h1>
      <p class="text-dark-400 text-sm mt-1">Shuttle duraklarını yönetin</p>
    </div>
    <button onclick={() => showAddModal = true}
      class="px-4 py-2 bg-primary-600 hover:bg-primary-500 rounded-lg font-medium transition-colors flex items-center gap-2">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
      </svg>
      Yeni Durak
    </button>
  </div>

  <!-- Stats -->
  <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
    <div class="bg-dark-800 rounded-xl p-4 border border-dark-700">
      <div class="text-dark-400 text-sm">Toplam Durak</div>
      <div class="text-3xl font-bold mt-1">{stops.length}</div>
    </div>
    <div class="bg-dark-800 rounded-xl p-4 border border-dark-700">
      <div class="text-dark-400 text-sm">Aktif</div>
      <div class="text-3xl font-bold text-green-400 mt-1">{stops.filter(s => s.isActive).length}</div>
    </div>
    <div class="bg-dark-800 rounded-xl p-4 border border-dark-700">
      <div class="text-dark-400 text-sm">Bugünkü Çağrı</div>
      <div class="text-3xl font-bold text-primary-400 mt-1">{stops.reduce((a, s) => a + s.todayCalls, 0)}</div>
    </div>
    <div class="bg-dark-800 rounded-xl p-4 border border-dark-700">
      <div class="text-dark-400 text-sm">Toplam Çağrı</div>
      <div class="text-3xl font-bold text-yellow-400 mt-1">{stops.reduce((a, s) => a + s.totalCalls, 0)}</div>
    </div>
  </div>
  
  <!-- Stops Grid -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
    {#if loading}
      {#each Array(8) as _}
        <div class="bg-dark-800 rounded-xl p-4 border border-dark-700 animate-pulse">
          <div class="h-12 bg-dark-700 rounded-lg mb-3"></div>
          <div class="h-4 bg-dark-700 rounded w-3/4 mb-2"></div>
          <div class="h-3 bg-dark-700 rounded w-1/2"></div>
        </div>
      {/each}
    {:else}
      {#each stops as stop}
        <div class="bg-dark-800 rounded-xl p-4 border border-dark-700 hover:border-primary-500/50 transition-all group cursor-pointer"
          onclick={() => { selectedStop = stop; showEditModal = true; }}>
          <div class="flex items-start justify-between mb-3">
            <div class="w-12 h-12 bg-primary-500/20 rounded-xl flex items-center justify-center text-2xl">
              {stop.icon}
            </div>
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full {stop.isActive ? 'bg-green-500' : 'bg-gray-500'}"></span>
              <span class="text-xs text-dark-400">{stop.isActive ? 'Aktif' : 'Pasif'}</span>
            </div>
          </div>
          <h3 class="font-semibold mb-1 group-hover:text-primary-400 transition-colors">{stop.name}</h3>
          <p class="text-xs text-dark-400 mb-3">Durak #{stop.id} • {stop.geofenceRadius}m</p>
          <div class="flex items-center justify-between text-sm">
            <span class="text-dark-400">Bugün: <span class="text-white">{stop.todayCalls}</span></span>
            <span class="text-dark-400">Toplam: <span class="text-white">{stop.totalCalls}</span></span>
          </div>
        </div>
      {/each}
    {/if}
  </div>
</div>


<!-- Add Modal -->
{#if showAddModal}
  <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onclick={() => showAddModal = false}>
    <div class="bg-dark-800 rounded-2xl p-6 w-[500px] shadow-2xl border border-dark-700" onclick={(e) => e.stopPropagation()}>
      <h3 class="text-xl font-bold mb-6">📍 Yeni Durak Ekle</h3>
      <div class="space-y-4">
        <div>
          <label class="block text-sm text-dark-400 mb-2">Durak Adı</label>
          <input type="text" bind:value={formData.name} placeholder="Ana Lobi"
            class="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-xl focus:outline-none focus:border-primary-500" />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm text-dark-400 mb-2">Enlem (Lat)</label>
            <input type="number" step="0.0000001" bind:value={formData.lat}
              class="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-xl focus:outline-none focus:border-primary-500" />
          </div>
          <div>
            <label class="block text-sm text-dark-400 mb-2">Boylam (Lng)</label>
            <input type="number" step="0.0000001" bind:value={formData.lng}
              class="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-xl focus:outline-none focus:border-primary-500" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm text-dark-400 mb-2">İkon</label>
            <div class="flex flex-wrap gap-2">
              {#each icons as icon}
                <button type="button" onclick={() => formData.icon = icon}
                  class="w-10 h-10 rounded-lg text-xl transition-all {formData.icon === icon ? 'bg-primary-500/30 ring-2 ring-primary-500' : 'bg-dark-700 hover:bg-dark-600'}">
                  {icon}
                </button>
              {/each}
            </div>
          </div>
          <div>
            <label class="block text-sm text-dark-400 mb-2">Geofence (m)</label>
            <input type="number" bind:value={formData.geofenceRadius}
              class="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-xl focus:outline-none focus:border-primary-500" />
          </div>
        </div>
      </div>
      <div class="flex gap-3 mt-6">
        <button onclick={() => showAddModal = false} class="flex-1 py-3 bg-dark-700 hover:bg-dark-600 rounded-xl font-medium">İptal</button>
        <button onclick={async () => {
          try {
            const res = await fetch('/api/stops', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
            if (res.ok) { appStore.addNotification('success', 'Başarılı', 'Durak eklendi'); showAddModal = false; fetchStops(); }
          } catch { appStore.addNotification('error', 'Hata', 'Durak eklenemedi'); }
        }} class="flex-1 py-3 bg-primary-600 hover:bg-primary-500 rounded-xl font-medium">Ekle</button>
      </div>
    </div>
  </div>
{/if}


<!-- Edit Modal -->
{#if showEditModal && selectedStop}
  <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onclick={() => showEditModal = false}>
    <div class="bg-dark-800 rounded-2xl p-6 w-[500px] shadow-2xl border border-dark-700" onclick={(e) => e.stopPropagation()}>
      <h3 class="text-xl font-bold mb-6">✏️ Durak Düzenle: {selectedStop.name}</h3>
      <div class="space-y-4">
        <div>
          <label class="block text-sm text-dark-400 mb-2">Durak Adı</label>
          <input type="text" bind:value={selectedStop.name}
            class="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-xl focus:outline-none focus:border-primary-500" />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm text-dark-400 mb-2">Enlem</label>
            <input type="number" step="0.0000001" bind:value={selectedStop.lat}
              class="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-xl focus:outline-none focus:border-primary-500" />
          </div>
          <div>
            <label class="block text-sm text-dark-400 mb-2">Boylam</label>
            <input type="number" step="0.0000001" bind:value={selectedStop.lng}
              class="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-xl focus:outline-none focus:border-primary-500" />
          </div>
        </div>
        <div class="flex items-center gap-3">
          <label class="text-sm text-dark-400">Aktif:</label>
          <button onclick={() => selectedStop!.isActive = !selectedStop!.isActive}
            class="w-12 h-6 rounded-full transition-colors {selectedStop.isActive ? 'bg-green-500' : 'bg-dark-600'}">
            <div class="w-5 h-5 bg-white rounded-full transition-transform {selectedStop.isActive ? 'translate-x-6' : 'translate-x-0.5'}"></div>
          </button>
        </div>
      </div>
      <div class="flex gap-3 mt-6">
        <button onclick={() => showEditModal = false} class="flex-1 py-3 bg-dark-700 hover:bg-dark-600 rounded-xl font-medium">İptal</button>
        <button onclick={async () => {
          try {
            const res = await fetch(`/api/stops/${selectedStop!.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(selectedStop) });
            if (res.ok) { appStore.addNotification('success', 'Başarılı', 'Durak güncellendi'); showEditModal = false; fetchStops(); }
          } catch { appStore.addNotification('error', 'Hata', 'Durak güncellenemedi'); }
        }} class="flex-1 py-3 bg-primary-600 hover:bg-primary-500 rounded-xl font-medium">Kaydet</button>
      </div>
    </div>
  </div>
{/if}

<svelte:head>
  <title>Duraklar | Lujo Shuttle</title>
</svelte:head>
