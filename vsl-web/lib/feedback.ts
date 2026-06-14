// Âm thanh + rung khi đúng/sai — tạo bằng WebAudio nên KHÔNG cần file nhạc.
let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    ctx ??= new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext)();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, start: number, dur: number, gain = 0.15) {
  const ac = audio();
  if (!ac) return;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0, ac.currentTime + start);
  g.gain.linearRampToValueAtTime(gain, ac.currentTime + start + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + start + dur);
  osc.connect(g).connect(ac.destination);
  osc.start(ac.currentTime + start);
  osc.stop(ac.currentTime + start + dur);
}

function vibrate(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* máy không hỗ trợ rung */
  }
}

export function feedbackCorrect(on: boolean) {
  if (!on) return;
  audio()?.resume(); // iOS cần resume sau tương tác người dùng
  tone(660, 0, 0.12); // hai nốt đi lên: ting-ting
  tone(880, 0.1, 0.18);
  vibrate([0, 35, 40, 35]);
}

export function feedbackWrong(on: boolean) {
  if (!on) return;
  audio()?.resume();
  tone(200, 0, 0.25, 0.12); // một nốt trầm
  vibrate(120);
}
