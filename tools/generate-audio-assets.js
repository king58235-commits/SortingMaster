const fs = require("node:fs");
const path = require("node:path");

const sampleRate = 22050;
const outputDir = path.resolve(__dirname, "../assets/audio");
fs.mkdirSync(outputDir, { recursive: true });

function envelope(t, duration, attack = 0.008, release = 0.08) {
  const up = Math.min(1, t / attack);
  const down = Math.min(1, Math.max(0, duration - t) / release);
  return up * down;
}

function oscillator(type, phase) {
  const cycle = phase / (Math.PI * 2);
  if (type === "triangle") return 2 * Math.abs(2 * (cycle - Math.floor(cycle + 0.5))) - 1;
  if (type === "square") return Math.sin(phase) >= 0 ? 1 : -1;
  if (type === "saw") return 2 * (cycle - Math.floor(cycle + 0.5));
  return Math.sin(phase);
}

function note(t, start, duration, frequency, type = "sine", volume = 1, endFrequency = frequency) {
  if (t < start || t >= start + duration) return 0;
  const local = t - start;
  const progress = local / duration;
  const frequencyNow = frequency + (endFrequency - frequency) * progress;
  return oscillator(type, Math.PI * 2 * frequencyNow * local) * envelope(local, duration) * volume;
}

function makeSound(filename, duration, render) {
  const frameCount = Math.ceil(duration * sampleRate);
  const samples = new Float32Array(frameCount);
  let peak = 0;
  for (let i = 0; i < frameCount; i += 1) {
    const value = render(i / sampleRate, i, frameCount);
    samples[i] = value;
    peak = Math.max(peak, Math.abs(value));
  }
  const scale = peak > 0.92 ? 0.92 / peak : 1;
  const dataSize = frameCount * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < frameCount; i += 1) {
    buffer.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i] * scale)) * 32767), 44 + i * 2);
  }
  fs.writeFileSync(path.join(outputDir, filename), buffer);
}

makeSound("ui-click.wav", 0.08, (t) =>
  note(t, 0, 0.07, 980, "triangle", 0.45, 620) + note(t, 0.012, 0.05, 1450, "sine", 0.16)
);

makeSound("sort-success.wav", 0.28, (t) =>
  note(t, 0, 0.16, 620, "triangle", 0.48) +
  note(t, 0.07, 0.19, 880, "triangle", 0.62) +
  note(t, 0.08, 0.16, 1320, "sine", 0.16)
);

makeSound("sort-error.wav", 0.34, (t) =>
  note(t, 0, 0.2, 235, "square", 0.24, 150) +
  note(t, 0.07, 0.25, 135, "triangle", 0.48, 92)
);

makeSound("fever-start.wav", 0.82, (t) =>
  note(t, 0, 0.25, 523.25, "triangle", 0.42) +
  note(t, 0.12, 0.28, 659.25, "triangle", 0.46) +
  note(t, 0.24, 0.32, 783.99, "triangle", 0.5) +
  note(t, 0.38, 0.42, 1046.5, "sine", 0.58) +
  note(t, 0.42, 0.34, 1568, "sine", 0.15)
);

makeSound("fever-loop.wav", 2, (t) => {
  const beat = t % 0.5;
  const bass = Math.sin(Math.PI * 2 * 82.41 * t) * (0.12 + 0.08 * Math.max(0, 1 - beat * 7));
  const pulse = note(beat, 0, 0.12, 440, "triangle", 0.15) + note(beat, 0.25, 0.12, 659.25, "triangle", 0.12);
  return bass + pulse;
});

makeSound("fever-end.wav", 0.38, (t) =>
  note(t, 0, 0.22, 784, "triangle", 0.38, 523.25) + note(t, 0.08, 0.28, 392, "sine", 0.28)
);

makeSound("time-warning.wav", 0.13, (t) =>
  note(t, 0, 0.12, 920, "square", 0.2) + note(t, 0, 0.12, 460, "sine", 0.28)
);

makeSound("result.wav", 0.9, (t) =>
  note(t, 0, 0.44, 523.25, "triangle", 0.3) +
  note(t, 0.12, 0.48, 659.25, "triangle", 0.34) +
  note(t, 0.24, 0.62, 783.99, "sine", 0.42)
);

makeSound("belt-loop.wav", 2, (t) => {
  const roller = Math.max(0, Math.sin(Math.PI * 2 * 4 * t)) ** 12;
  const hum = Math.sin(Math.PI * 2 * 55 * t) * 0.055 + Math.sin(Math.PI * 2 * 110 * t) * 0.018;
  return hum + roller * 0.06;
});

console.log(`Generated audio assets in ${outputDir}`);
