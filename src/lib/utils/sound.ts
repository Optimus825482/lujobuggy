// ============================================
// SOUND UTILITIES
// Bildirim sesleri için yardımcı fonksiyonlar
// ============================================

// Web Audio API ile basit bip sesi
export function playNotificationSound() {
  try {
    const audioContext = new (window.AudioContext ||
      (window as any).webkitAudioContext)();

    // İki tonlu bip sesi (daha dikkat çekici)
    const playTone = (
      frequency: number,
      startTime: number,
      duration: number
    ) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = "sine";

      gainNode.gain.setValueAtTime(0.3, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    };

    const now = audioContext.currentTime;
    playTone(880, now, 0.15); // A5
    playTone(1100, now + 0.15, 0.15); // C#6
    playTone(880, now + 0.3, 0.2); // A5
  } catch (err) {
    console.warn("Ses çalınamadı:", err);
  }
}

// Başarı sesi
export function playSuccessSound() {
  try {
    const audioContext = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
    const now = audioContext.currentTime;

    const playTone = (
      frequency: number,
      startTime: number,
      duration: number
    ) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = "sine";

      gainNode.gain.setValueAtTime(0.2, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    };

    playTone(523, now, 0.1); // C5
    playTone(659, now + 0.1, 0.1); // E5
    playTone(784, now + 0.2, 0.15); // G5
  } catch (err) {
    console.warn("Ses çalınamadı:", err);
  }
}
