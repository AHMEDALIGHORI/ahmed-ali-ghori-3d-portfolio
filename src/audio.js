/**
 * Ambient rooftop sound, synthesised in the browser — no audio file to license.
 * Low city rumble + a faint electrical hum, faded in and out on demand.
 */
export function createAmbience() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  let ctx = null;
  let master = null;
  let started = false;

  function build() {
    ctx = new AudioCtx();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    // city rumble: filtered brown noise
    const length = ctx.sampleRate * 4;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < length; i += 1) {
      const white = Math.random() * 2 - 1;
      lastOut = (lastOut + 0.02 * white) / 1.02;
      data[i] = lastOut * 3.2;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 340;
    lp.Q.value = 0.6;

    const rumbleGain = ctx.createGain();
    rumbleGain.gain.value = 0.5;

    noise.connect(lp).connect(rumbleGain).connect(master);
    noise.start();

    // electrical hum, two detuned sines through a soft lowpass
    const humGain = ctx.createGain();
    humGain.gain.value = 0.06;
    const humFilter = ctx.createBiquadFilter();
    humFilter.type = 'lowpass';
    humFilter.frequency.value = 800;
    humFilter.connect(humGain).connect(master);

    for (const [freq, gain] of [[55, 0.6], [82.5, 0.35], [110, 0.18]]) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.value = gain;
      osc.connect(g).connect(humFilter);
      osc.start();
    }

    // very slow breathing so it never feels like a static tone
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.06;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.18;
    lfo.connect(lfoGain).connect(rumbleGain.gain);
    lfo.start();
  }

  async function enable() {
    if (!AudioCtx) return false;
    if (!started) {
      build();
      started = true;
    }
    if (ctx.state === 'suspended') await ctx.resume();
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(0.22, ctx.currentTime, 0.8);
    return true;
  }

  function disable() {
    if (!ctx) return;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
  }

  return {
    supported: Boolean(AudioCtx),
    enable,
    disable,
    isOn: () => Boolean(ctx) && master.gain.value > 0.01,
  };
}
