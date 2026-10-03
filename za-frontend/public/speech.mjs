/** Stop aborts pending synthesis as well as playback; stale responses never speak. */
export class NeuralSpeech {
  constructor(notify) { this.notify = notify; this.generation = 0; this.audio = null; this.url = null; this.request = null; this.languages = []; }
  async load() {
    try { const response = await fetch('/api/speech/config'); const config = await response.json(); this.languages = config.enabled ? config.languages : []; } catch { this.languages = []; }
  }
  stop() {
    this.generation++; this.request?.abort(); this.request = null;
    if (this.audio) { this.audio.pause(); this.audio.removeAttribute('src'); this.audio.load(); this.audio = null; }
    if (this.url) URL.revokeObjectURL(this.url); this.url = null;
  }
  async speak(text, pack, rate) {
    this.stop(); const generation = this.generation;
    if (!this.languages.includes(pack.code)) { this.notify(pack.ui.installVoice); return; }
    this.request = new AbortController();
    // Creating the player within the activation handler helps browsers honor audio permission.
    const player = new Audio(); this.audio = player;
    try {
      const response = await fetch('/api/speech', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language: pack.code, rate }), signal: this.request.signal });
      if (!response.ok) throw new Error('Speech unavailable');
      const blob = await response.blob(); if (generation !== this.generation) return;
      this.url = URL.createObjectURL(blob); player.src = this.url;
      player.onended = () => { if (generation === this.generation) { this.stop(); this.notify(pack.ui.ready); } };
      player.onerror = () => { if (generation === this.generation) { this.stop(); this.notify(pack.ui.speechFailed); } };
      await player.play(); if (generation === this.generation) this.notify(pack.ui.speaking);
    } catch (error) {
      if (generation === this.generation && error.name !== 'AbortError') { this.stop(); this.notify(pack.ui.speechFailed); }
    }
  }
}
