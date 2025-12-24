<script lang="ts">
  import { onMount } from 'svelte';
  import { appStore } from '$lib/stores/app.svelte';
  import { STOPS } from '$lib/config/lujo';
  
  interface Call {
    id: number;
    stopId: number;
    stopName: string;
    status: 'pending' | 'assigned' | 'completed' | 'cancelled';
    priority: 'normal' | 'high' | 'vip';
    guestCount: number;
    assignedVehicleId: number | null;
    assignedVehicleName: string | null;
    createdAt: Date;
    assignedAt: Date | null;
    completedAt: Date | null;
    waitTime: number;
    notes: string;
  }
  
  let calls = $state<Call[]>([]);
  let loading = $state(true);
  let filter = $state<'all' | 'pending' | 'assigned' | 'completed'>('all');
  let showNewCallModal = $state(false);
  
  let newCall = $state({ stopId: 1, priority: 'normal' as Call['priority'], guestCount: 1, notes: '' });
  
  async function fetchCalls() {
    loading = true;
    try {
      const res = await fetch('/api/calls');
      if (res.ok) {
        const data = await res.json();
        calls = data.data.map((c: any) => ({
          ...c,
          stopName: c.stopName || STOPS.find(s => s.id === c.stopId)?.name || 'Bilinmeyen',
          createdAt: new Date(c.createdAt),
          assignedAt: c.assignedAt ? new Date(c.assignedAt) : null,
          completedAt: c.completedAt ? new Date(c.completedAt) : null,
          waitTime: c.waitTime || 0
        }));
      }
    } catch (err) {
      console.error('Çağrılar yüklenemedi:', err);
    } finally {
      loading = false;
    }
  }
  
  onMount(() => {
    fetchCalls();
    const interval = setInterval(fetchCalls, 10000);
    return () => clearInterval(interval);
  });
</script>

<div class="p-6">
  <div class="flex items-center justify-between mb-6">
    <div>
      <h1 class="text-2xl font-bold">📞 Çağrı Yönetimi</h1>
      <p class="text-dark-400 text-sm mt-1">Shuttle çağrılarını takip edin ve yönetin</p>
    </div>
    <button onclick={() => showNewCallModal = true}
      class="px-4 py-2 bg-primary-600 hover:bg-primary-500 rounded-lg font-medium transition-colors flex items-center gap-2">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
      </svg>
      Manuel Çağrı
    </button>
  </div>

  <!-- Stats -->
  <div class="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
    <div class="bg-dark-800 rounded-xl p-4 border border-dark-700">
      <div class="text-dark-400 text-sm">Toplam</div>
      <div class="text-3xl font-bold mt-1">{calls.length}</div>
    </div>
    <div class="bg-dark-800 rounded-xl p-4 border border-red-500/30">
      <div class="text-dark-400 text-sm">Bekleyen</div>
      <div class="text-3xl font-bold text-red-400 mt-1">{calls.filter(c => c.status === 'pending').length}</div>
    </div>
    <div class="bg-dark-800 rounded-xl p-4 border border-yellow-500/30">
      <div class="text-dark-400 text-sm">Atanan</div>
      <div class="text-3xl font-bold text-yellow-400 mt-1">{calls.filter(c => c.status === 'assigned').length}</div>
    </div>
    <div class="bg-dark-800 rounded-xl p-4 border border-green-500/30">
      <div class="text-dark-400 text-sm">Tamamlanan</div>
      <div class="text-3xl font-bold text-green-400 mt-1">{calls.filter(c => c.status === 'completed').length}</div>
    </div>
    <div class="bg-dark-800 rounded-xl p-4 border border-dark-700">
      <div class="text-dark-400 text-sm">Ort. Bekleme</div>
      <div class="text-3xl font-bold text-primary-400 mt-1">
        {Math.round(calls.filter(c => c.completedAt).reduce((a, c) => a + c.waitTime, 0) / Math.max(calls.filter(c => c.completedAt).length, 1))}s
      </div>
    </div>
  </div>
  
  <!-- Filter Tabs -->
  <div class="flex gap-2 mb-4">
    {#each [['all', 'Tümü'], ['pending', 'Bekleyen'], ['assigned', 'Atanan'], ['completed', 'Tamamlanan']] as [key, label]}
      <button onclick={() => filter = key as typeof filter}
        class="px-4 py-2 rounded-lg text-sm font-medium transition-all {filter === key ? 'bg-primary-500/20 text-primary-400' : 'bg-dark-800 text-dark-400 hover:text-white'}">
        {label}
      </button>
    {/each}
  </div>
  
  <!-- Calls Table -->
  <div class="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden">
    <table class="w-full">
      <thead class="bg-dark-900">
        <tr>
          <th class="px-6 py-4 text-left text-xs font-semibold text-dark-400 uppercase">ID</th>
          <th class="px-6 py-4 text-left text-xs font-semibold text-dark-400 uppercase">Durak</th>
          <th class="px-6 py-4 text-left text-xs font-semibold text-dark-400 uppercase">Öncelik</th>
          <th class="px-6 py-4 text-left text-xs font-semibold text-dark-400 uppercase">Misafir</th>
          <th class="px-6 py-4 text-left text-xs font-semibold text-dark-400 uppercase">Durum</th>
          <th class="px-6 py-4 text-left text-xs font-semibold text-dark-400 uppercase">Araç</th>
          <th class="px-6 py-4 text-left text-xs font-semibold text-dark-400 uppercase">Zaman</th>
          <th class="px-6 py-4 text-left text-xs font-semibold text-dark-400 uppercase">Bekleme</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-dark-700">
        {#if loading}
          <tr><td colspan="8" class="px-6 py-12 text-center text-dark-400">
            <div class="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-2"></div>
            Yükleniyor...
          </td></tr>
        {:else}
          {#each calls.filter(c => filter === 'all' || c.status === filter) as call}
            <tr class="hover:bg-dark-750">
              <td class="px-6 py-4 font-mono text-sm">#{call.id}</td>
              <td class="px-6 py-4">
                <div class="flex items-center gap-2">
                  <span>{STOPS.find(s => s.id === call.stopId)?.icon || '📍'}</span>
                  <span>{call.stopName}</span>
                </div>
              </td>
              <td class="px-6 py-4">
                <span class="px-2 py-1 rounded text-xs font-medium
                  {call.priority === 'vip' ? 'bg-purple-500/20 text-purple-400' : 
                   call.priority === 'high' ? 'bg-red-500/20 text-red-400' : 'bg-dark-700 text-dark-300'}">
                  {call.priority === 'vip' ? '👑 VIP' : call.priority === 'high' ? '🔥 Yüksek' : 'Normal'}
                </span>
              </td>
              <td class="px-6 py-4">{call.guestCount} kişi</td>
              <td class="px-6 py-4">
                <span class="px-2 py-1 rounded text-xs font-medium
                  {call.status === 'pending' ? 'bg-red-500/20 text-red-400' :
                   call.status === 'assigned' ? 'bg-yellow-500/20 text-yellow-400' :
                   call.status === 'completed' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}">
                  {call.status === 'pending' ? 'Bekliyor' : call.status === 'assigned' ? 'Atandı' : call.status === 'completed' ? 'Tamamlandı' : 'İptal'}
                </span>
              </td>
              <td class="px-6 py-4 text-dark-300">{call.assignedVehicleName || '-'}</td>
              <td class="px-6 py-4 text-dark-400 text-sm">{new Date(call.createdAt).toLocaleTimeString('tr-TR')}</td>
              <td class="px-6 py-4 text-dark-300">{call.waitTime}s</td>
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>
</div>


<!-- New Call Modal -->
{#if showNewCallModal}
  <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onclick={() => showNewCallModal = false}>
    <div class="bg-dark-800 rounded-2xl p-6 w-[450px] shadow-2xl border border-dark-700" onclick={(e) => e.stopPropagation()}>
      <h3 class="text-xl font-bold mb-6">📞 Manuel Çağrı Oluştur</h3>
      <div class="space-y-4">
        <div>
          <label class="block text-sm text-dark-400 mb-2">Durak</label>
          <select bind:value={newCall.stopId} class="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-xl focus:outline-none focus:border-primary-500">
            {#each STOPS as stop}
              <option value={stop.id}>{stop.icon} {stop.name}</option>
            {/each}
          </select>
        </div>
        <div>
          <label for="priority-select" class="block text-sm text-dark-400 mb-2">Öncelik</label>
          <select id="priority-select" bind:value={newCall.priority} class="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-xl focus:outline-none focus:border-primary-500">
            <option value="normal">Normal</option>
            <option value="high">Yüksek</option>
            <option value="vip">VIP</option>
          </select>
        </div>
        <div>
          <label for="guest-count" class="block text-sm text-dark-400 mb-2">Misafir Sayısı</label>
          <input id="guest-count" type="number" min="1" max="6" bind:value={newCall.guestCount}
            class="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-xl focus:outline-none focus:border-primary-500" />
        </div>
        <div>
          <label for="call-notes" class="block text-sm text-dark-400 mb-2">Not</label>
          <textarea id="call-notes" bind:value={newCall.notes} rows="2" placeholder="Opsiyonel not..."
            class="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-xl focus:outline-none focus:border-primary-500 resize-none"></textarea>
        </div>
      </div>
      <div class="flex gap-3 mt-6">
        <button onclick={() => showNewCallModal = false} class="flex-1 py-3 bg-dark-700 hover:bg-dark-600 rounded-xl font-medium">İptal</button>
        <button onclick={async () => {
          try {
            const stop = STOPS.find(s => s.id === newCall.stopId);
            const res = await fetch('/api/calls', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...newCall, stopName: stop?.name })
            });
            if (res.ok) {
              appStore.addNotification('success', 'Başarılı', 'Çağrı oluşturuldu');
              showNewCallModal = false;
              fetchCalls();
            }
          } catch { appStore.addNotification('error', 'Hata', 'Çağrı oluşturulamadı'); }
        }} class="flex-1 py-3 bg-primary-600 hover:bg-primary-500 rounded-xl font-medium">Oluştur</button>
      </div>
    </div>
  </div>
{/if}

<script context="module">
</script>
