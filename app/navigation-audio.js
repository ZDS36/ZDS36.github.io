const sounds = {
  ink: [
    { at: .02, length: .11, type: 'sine', from: 860, to: 510, level: .12, shape: [0, .70, 1, .48, .16, 0] },
    { at: .09, length: .35, type: 'bandpass', from: 1640, to: 1100, level: .11, shape: [0, .50, 1, .54, .19, 0] },
    { at: .17, length: .98, type: 'bandpass', from: 1500, to: 970, level: .10, shape: [0, .42, 1, .61, .24, 0] },
    { at: .26, length: .085, type: 'sine', from: 1050, to: 680, level: .06, shape: [0, .65, 1, .41, .12, 0] },
  ],
  tear: [
    { at: .06, length: .32, type: 'bandpass', from: 680, to: 1180, level: .20, shape: [0, .2, .43, .28, 1, .49, 0] },
    { at: .28, length: .39, type: 'bandpass', from: 1840, to: 1210, level: .42, shape: [0, .56, .77, 1, .55, .67, .32, 0] },
    { at: .68, length: .19, type: 'bandpass', from: 1060, to: 1830, level: .22, shape: [0, .32, 1, .42, .48, 0] },
    { at: .83, length: .29, type: 'bandpass', from: 1460, to: 2260, level: .38, shape: [0, .42, .52, .86, .62, 1, .28, 0] },
    { at: 1.05, length: .18, type: 'lowpass', from: 2450, to: 920, level: .34, shape: [0, .55, 1, .52, .18, 0] },
    { at: 1.14, length: .33, type: 'bandpass', from: 1510, to: 730, level: .20, shape: [0, .45, 1, .56, .39, 0] },
  ],
  shred: [
    { at: .04, length: .97, type: 'triangle', from: 103, to: 156, level: .08, shape: [0, .27, .61, 1, .8, .45, 0] },
    { at: .08, length: .90, type: 'bandpass', from: 640, to: 1030, level: .19, shape: [0, .32, .66, .64, .87, .73, 1, .56, 0] },
    { at: .94, length: .32, type: 'bandpass', from: 2020, to: 1000, level: .28, shape: [0, .45, .51, 1, .63, .32, 0] },
    { at: 1.18, length: .66, type: 'bandpass', from: 1230, to: 520, level: .18, shape: [0, .51, 1, .67, .32, .13, 0] },
    ...[.16, .23, .31, .39, .46, .52, .57, .62, .67, .71, .76, .81, .87, .94].map((at, index) => ({
      at, length: .066, type: 'bandpass', from: 1560 + index % 3 * 255, to: 970, level: .28,
      shape: [0, .48, 1, .56, .22, 0],
    })),
  ],
};

let context;
let resume;
let noise;

export function unlockNavigationAudio() {
  try {
    const Audio = window.AudioContext ?? window.webkitAudioContext;
    if (!Audio) return;
    context ??= new Audio();
    if (context.state !== 'running') resume = context.resume().catch(() => {});
  } catch {
    // Audio permissions and device failures should never delay navigation.
  }
}

function makeNoise(audio) {
  const buffer = audio.createBuffer(1, Math.ceil(audio.sampleRate * 1.25), audio.sampleRate);
  const samples = buffer.getChannelData(0);
  let seed = 84391;
  for (let i = 0; i < samples.length; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    samples[i] = seed / 2147483648 - 1;
  }
  return buffer;
}

function schedule(audio, voices) {
  const output = audio.createGain();
  output.gain.value = .18;
  output.connect(audio.destination);
  const start = audio.currentTime + .01;
  const playing = new Set();
  for (const [index, voice] of voices.entries()) {
    const { at, length, type, from, to, level, shape } = voice;
    const when = start + at;
    const gain = audio.createGain();
    const tonal = type === 'sine' || type === 'triangle';
    const source = tonal ? audio.createOscillator() : audio.createBufferSource();
    let filter;
    if (tonal) {
      source.type = type;
    } else {
      noise ??= makeNoise(audio);
      source.buffer = noise;
      filter = audio.createBiquadFilter();
      filter.type = type;
      filter.Q.value = type === 'bandpass' ? .75 : .55;
      source.connect(filter);
    }
    const input = filter ?? source;
    input.frequency.setValueAtTime(from, when);
    input.frequency.exponentialRampToValueAtTime(to, when + length);
    input.connect(gain);
    gain.connect(output);
    gain.gain.value = 0;
    gain.gain.setValueCurveAtTime(Float32Array.from(shape, amount => amount * level), when, length);
    playing.add(source);
    source.onended = () => {
      source.disconnect();
      filter?.disconnect();
      gain.disconnect();
      playing.delete(source);
      if (!playing.size) output.disconnect();
    };
    if (tonal) source.start(when);
    else source.start(when, index * .019);
    source.stop(when + length);
  }
  return () => {
    const now = audio.currentTime;
    output.gain.setTargetAtTime(0, now, .01);
    for (const source of playing) source.stop(now + .04);
  };
}

export function playNavigationSound(name) {
  let canceled = false;
  let fadeOut;
  if (context && sounds[name]) {
    Promise.resolve(resume).then(() => {
      if (!canceled && context.state === 'running') fadeOut = schedule(context, sounds[name]);
    }).catch(() => {});
  }
  return () => {
    canceled = true;
    fadeOut?.();
  };
}
