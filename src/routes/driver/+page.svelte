<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';

  // State
  let deviceId = $state('');
  let traccarUrl = $state('');
  let interval = $state(5); // saniye
  let isTracking = $state(false);
  let lastPosition = $state<GeolocationPosition | null>(null);
  let lastSentTime = $state<Date | null>(null);
  let error = $state('');
  let status = $state<'idle' | 'tracking' | 'error'>('idle');
  let sendCount = $state(0);
  let wakeLock = $state<WakeLockSentinel | null>(null);
  let watchId = $state<number | null>(null);
  let logs = $state<Array<{ time: string; message: string; type: 'info' | 'success' | 'error' }>>([]);

  // LocalStorage'dan ayarları yükle
  onMount(() => {
    if (browser) {
      deviceId = localStorage.getItem('gps_deviceId') || '';
      traccarUrl = localStorage.getItem('gps_traccarUrl') || 'http://localhost:5055';
      interval = parseInt(localStorage.getItem('gps_interval') || '5');
    }
  });

  // Cleanup
  onDestroy(() => {
    stopTracking();
  });

  function addLog(message: string, type: 'info' | 'success' | 'error' = 'info') {
    const time = new Date().toLocaleTimeString('tr-TR');
    logs = [{ time, message, type }, ...logs.slice(0, 49)]; // Son 50 log
  }

  function saveSettings() {
    if (browser) {
      localStorage.setItem('gps_deviceId', deviceId);
      localStorage.setItem('gps_traccarUrl', traccarUrl);
      localStorage.setItem('gps_interval', interval.toString());
      addLog('Ayarlar kaydedildi', 'success');
    }
  }

  async function requestWakeLock() {
    if ('wakeLock' in navigator) {
      try {
        wakeLock = await navigator.wakeLock.request('screen');
        addLog('Ekran kilidi aktif - ekran kapanmayacak', 'success');
        
        wakeLock.addEventListener('release', () => {
          addLog('Ekran kilidi serbest bırakıldı', 'info');
        });
      } catch (err) {
        addLog(`Wake Lock hatası: ${err}`, 'error');
      }
    } else {
      addLog('Wake Lock API desteklenmiyor', 'error');
    }
  }

  async function releaseWakeLock() {
    if (wakeLock) {
      await wakeLock.release();
      wakeLock = null;
    }
  }

  async function sendPosition(position: GeolocationPosition) {
    const { latitude, longitude, altitude, speed, heading, accuracy } = position.coords;
    const timestamp = Math.floor(position.timestamp / 1000);
    
    // OsmAnd protokolü URL'i oluştur
    const params = new URLSearchParams({
      id: deviceId,
      lat: latitude.toString(),
      lon: longitude.toString(),
      timestamp: timestamp.toString(),
      accuracy: accuracy?.toString() || '0',
      speed: speed ? (speed * 3.6).toString() : '0', // m/s -> km/h
      bearing: heading?.toString() || '0',
      altitude: altitude?.toString() || '0'
    });

    const url = `${traccarUrl}/?${params.toString()}`;

    try {
      const response = await fetch(url, { mode: 'no-cors' }); // CORS bypass
      sendCount++;
      lastSentTime = new Date();
      addLog(`📍 Konum gönderildi: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`, 'success');
    } catch (err) {
      addLog(`Gönderim hatası: ${err}`, 'error');
    }
  }

  let sendIntervalId: ReturnType<typeof setInterval> | null = null;

  function startTracking() {
    if (!deviceId) {
      error = 'Cihaz ID gerekli!';
      return;
    }
    if (!traccarUrl) {
      error = 'Traccar URL gerekli!';
      return;
    }

    error = '';
    saveSettings();

    if (!navigator.geolocation) {
      error = 'Geolocation desteklenmiyor!';
      status = 'error';
      return;
    }

    // Wake Lock al
    requestWakeLock();

    // GPS izlemeyi başlat
    watchId = navigator.geolocation.watchPosition(
      (position) => {
        lastPosition = position;
        status = 'tracking';
      },
      (err) => {
        error = `GPS Hatası: ${err.message}`;
        status = 'error';
        addLog(`GPS Hatası: ${err.message}`, 'error');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );

    // Periyodik gönderim
    sendIntervalId = setInterval(() => {
      if (lastPosition) {
        sendPosition(lastPosition);
      }
    }, interval * 1000);

    isTracking = true;
    addLog(`Takip başladı - ${interval} saniye aralıkla`, 'success');
  }

  function stopTracking() {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }
    if (sendIntervalId) {
      clearInterval(sendIntervalId);
      sendIntervalId = null;
    }
    releaseWakeLock();
    isTracking = false;
    status = 'idle';
    addLog('Takip durduruldu', 'info');
  }

  // Visibility change - sayfa gizlendiğinde wake lock'u yenile
  function handleVisibilityChange() {
    if (document.visibilityState === 'visible' && isTracking && !wakeLock) {
      requestWakeLock();
    }
  }

  onMount(() => {
    if (browser) {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }
  });

  onDestroy(() => {
    if (browser) {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
  });
</script>

<svelte:head>
  <title>🚗 Sürücü GPS Tracker</title>
  <meta name="theme-color" content="#0f172a" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
</svelte:head>

<div class="min-h-screen bg-dark-900 text-white p-4">
  <!-- Header -->
  <div class="text-center mb-6">
    <h1 class="text-2xl font-bold">🚗 Sürücü GPS Tracker</h1>
    <p class="text-dark-400 text-sm mt-1">Traccar'a konum gönder</p>
  </div>

  <!-- Status Card -->
  <div class="bg-dark-800 rounded-2xl p-6 mb-4 border border-dark-700">
    <div class="flex items-center justify-between mb-4">
      <span class="text-dark-400">Durum</span>
      <div class="flex items-center gap-2">
        {#if status === 'tracking'}
          <div class="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          <span class="text-green-400 font-medium">Aktif</span>
        {:else if status === 'error'}
          <div class="w-3 h-3 bg-red-500 rounded-full"></div>
          <span class="text-red-400 font-medium">Hata</span>
        {:else}
          <div class="w-3 h-3 bg-dark-500 rounded-full"></div>
          <span class="text-dark-400 font-medium">Bekliyor</span>
        {/if}
      </div>
    </div>

    {#if lastPosition}
      <div class="grid grid-cols-2 gap-4 text-sm">
        <div>
          <div class="text-dark-500">Enlem</div>
          <div class="font-mono">{lastPosition.coords.latitude.toFixed(6)}</div>
        </div>
        <div>
          <div class="text-dark-500">Boylam</div>
          <div class="font-mono">{lastPosition.coords.longitude.toFixed(6)}</div>
        </div>
        <div>
          <div class="text-dark-500">Hız</div>
          <div class="font-mono">{lastPosition.coords.speed ? (lastPosition.coords.speed * 3.6).toFixed(1) : '0'} km/h</div>
        </div>
        <div>
          <div class="text-dark-500">Doğruluk</div>
          <div class="font-mono">±{lastPosition.coords.accuracy?.toFixed(0) || '?'} m</div>
        </div>
      </div>
    {/if}

    <div class="mt-4 pt-4 border-t border-dark-700 flex justify-between text-sm">
      <span class="text-dark-500">Gönderilen: <span class="text-white font-medium">{sendCount}</span></span>
      {#if lastSentTime}
        <span class="text-dark-500">Son: <span class="text-white">{lastSentTime.toLocaleTimeString('tr-TR')}</span></span>
      {/if}
    </div>
  </div>

  <!-- Settings -->
  {#if !isTracking}
    <div class="bg-dark-800 rounded-2xl p-6 mb-4 border border-dark-700 space-y-4">
      <h2 class="font-semibold text-lg mb-4">⚙️ Ayarlar</h2>
      
      <div>
        <label for="deviceId" class="block text-sm text-dark-400 mb-2">Cihaz ID</label>
        <input 
          id="deviceId"
          type="text" 
          bind:value={deviceId}
          placeholder="buggy-01"
          class="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-xl focus:outline-none focus:border-primary-500"
        />
      </div>

      <div>
        <label for="traccarUrl" class="block text-sm text-dark-400 mb-2">Traccar OsmAnd URL</label>
        <input 
          id="traccarUrl"
          type="url" 
          bind:value={traccarUrl}
          placeholder="http://traccar.example.com:5055"
          class="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-xl focus:outline-none focus:border-primary-500"
        />
        <p class="text-xs text-dark-500 mt-1">Port genellikle 5055'tir</p>
      </div>

      <div>
        <label for="interval" class="block text-sm text-dark-400 mb-2">Gönderim Aralığı: {interval} saniye</label>
        <input 
          id="interval"
          type="range" 
          bind:value={interval}
          min="1"
          max="30"
          class="w-full accent-primary-500"
        />
      </div>
    </div>
  {/if}

  <!-- Error -->
  {#if error}
    <div class="bg-red-500/20 border border-red-500/30 rounded-xl p-4 mb-4">
      <p class="text-red-400">{error}</p>
    </div>
  {/if}

  <!-- Action Button -->
  <button
    onclick={() => isTracking ? stopTracking() : startTracking()}
    class="w-full py-4 rounded-2xl font-bold text-lg transition-all {isTracking 
      ? 'bg-red-500 hover:bg-red-600' 
      : 'bg-green-500 hover:bg-green-600'}"
  >
    {isTracking ? '⏹️ Durdur' : '▶️ Takibi Başlat'}
  </button>

  <!-- Wake Lock Info -->
  <div class="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
    <p class="text-yellow-400 text-sm text-center">
      ⚠️ Takip sırasında ekranı açık tutun. Uygulama arka plana alınırsa GPS durabilir.
    </p>
  </div>

  <!-- Logs -->
  <div class="mt-6">
    <h3 class="font-semibold mb-3">📋 Loglar</h3>
    <div class="bg-dark-800 rounded-xl border border-dark-700 max-h-48 overflow-y-auto">
      {#each logs as log}
        <div class="px-4 py-2 border-b border-dark-700 last:border-0 text-sm flex gap-3">
          <span class="text-dark-500 font-mono text-xs">{log.time}</span>
          <span class="{log.type === 'success' ? 'text-green-400' : log.type === 'error' ? 'text-red-400' : 'text-dark-300'}">
            {log.message}
          </span>
        </div>
      {:else}
        <div class="px-4 py-3 text-dark-500 text-center">Henüz log yok</div>
      {/each}
    </div>
  </div>

  <!-- Back Link -->
  <div class="mt-6 text-center">
    <a href="/" class="text-primary-400 hover:text-primary-300">← Ana Sayfaya Dön</a>
  </div>
</div>
