export function createAmbience() {
  let context, master, noise, enabled = false;
  const voices = [];

  function initialize() {
    context = new (window.AudioContext || window.webkitAudioContext)();
    master = context.createGain();
    master.gain.value = 0;
    master.connect(context.destination);
    const length = context.sampleRate * 6;
    const buffer = context.createBuffer(2, length, context.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      let previous = 0;
      for (let i = 0; i < length; i++) {
        previous = (previous + (Math.random() * 2 - 1) * .018) / 1.02;
        data[i] = previous * 2.5;
      }
    }
    noise = context.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    const lowpass = context.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 800;
    noise.connect(lowpass).connect(master);
    noise.start();
    for (const frequency of [146.83, 220, 293.66, 440.0]) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.value = .011;
      oscillator.connect(gain).connect(master);
      oscillator.start();
      voices.push(oscillator);
    }
  }

  return {
    async toggle() {
      if (!context) initialize();
      await context.resume();
      enabled = !enabled;
      master.gain.cancelScheduledValues(context.currentTime);
      master.gain.setTargetAtTime(enabled ? .5 : 0, context.currentTime, .6);
      return enabled;
    },
    setMode(mode) {
      if (!context) return;
      const ratio = mode === 'ember' ? .89 : mode === 'mist' ? 1.125 : 1;
      [146.83, 220, 293.66, 440].forEach((frequency, i) => voices[i].frequency.setTargetAtTime(frequency * ratio, context.currentTime, 1));
    },
    dispose() { context?.close(); },
  };
}
