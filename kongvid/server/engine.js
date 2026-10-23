// Kongvid - utilitas yt-dlp & ffmpeg
const { execFile, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const YTDLP = process.env.YTDLP_PATH || 'yt-dlp';
const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg';
const OUTPUT_DIR = process.env.OUTPUT_DIR || path.join(__dirname, 'downloads');
// tambahkan argumen yt-dlp tambahan via env, contoh: YTDLP_EXTRA_ARGS="--extractor-args youtube:player_client=android"
const EXTRA_ARGS = (process.env.YTDLP_EXTRA_ARGS || '').split(' ').filter(Boolean);

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

function id() {
  return Date.now().toString(36) + '-' + crypto.randomBytes(4).toString('hex');
}

function run(bin, args, timeoutMs = 10 * 60 * 1000) {
  return new Promise((resolve, reject) => {
    execFile(bin, args, { maxBuffer: 20 * 1024 * 1024, timeout: timeoutMs }, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr || err.message));
      resolve(stdout);
    });
  });
}

// Ambil metadata video (judul, thumbnail, durasi, format yang tersedia)
async function getInfo(url) {
  const raw = await run(YTDLP, ['--js-runtimes', 'deno', ...EXTRA_ARGS, '--no-playlist', '-J', url]);
  const j = JSON.parse(raw);
  const formats = (j.formats || []).filter((f) => f.vcodec !== 'none' && f.height);
  const heights = [...new Set(formats.map((f) => f.height))].sort((a, b) => a - b);
  // pilih representasi terbaik per resolusi
  const qualities = heights.map((h) => {
    const best = formats.filter((f) => f.height === h).sort((a, b) => (b.tbr || 0) - (a.tbr || 0))[0];
    return {
      height: h,
      ext: best.ext,
      filesize: best.filesize || null,
      fps: best.fps || null,
    };
  });
  const thumbs = (j.thumbnails || []).map((t) => t.url);
  return {
    id: j.id,
    title: j.title,
    uploader: j.uploader || j.channel || j.creator || 'Unknown',
    duration: j.duration || 0,
    thumbnail: thumbs.length ? thumbs[Math.floor(thumbs.length / 2)] : null,
    webpage: j.webpage_url || url,
    extractor: j.extractor_key || j.extractor || 'generic',
    qualities,
    subtitles: Object.keys(j.subtitles || {}).concat(Object.keys(j.automatic_captions || {})).filter((v, i, a) => a.indexOf(v) === i),
  };
}

function pickFormat(height) {
  // bv+ba dengan fallback; batasi resolusi
  return `bestvideo[height<=${height}]+bestaudio/best[height<=${height}]`;
}

// Download video ke file mp4 pada resolusi terpilih
async function downloadVideo(url, height, destName) {
  const out = path.join(OUTPUT_DIR, destName + '.mp4');
  const args = [
    '--js-runtimes', 'deno',
    ...EXTRA_ARGS,
    '--no-playlist',
    '-f', pickFormat(height),
    '--merge-output-format', 'mp4',
    '-o', out,
    url,
  ];
  await run(YTDLP, args);
  return out;
}

// Konversi ke MP3
async function toMp3(urlOrFile, destName, isUrl = true, bitrate = '192') {
  const tmpVid = path.join(OUTPUT_DIR, destName + '-src.mp4');
  let src = urlOrFile;
  if (isUrl) {
    const args = ['--js-runtimes', 'deno', ...EXTRA_ARGS, '--no-playlist', '-f', 'bestaudio/best', '-o', tmpVid, urlOrFile];
    await run(YTDLP, args);
    src = tmpVid;
  }
  const out = path.join(OUTPUT_DIR, destName + '.mp3');
  await run(FFMPEG, ['-y', '-i', src, '-vn', '-acodec', 'libmp3lame', '-ab', bitrate + 'k', out]);
  return out;
}

// Ambil subtitle sebagai SRT
async function getSubtitles(url, lang) {
  const dest = path.join(OUTPUT_DIR, id() + '-sub');
  const args = ['--js-runtimes', 'deno', ...EXTRA_ARGS, '--no-playlist', '--write-subs', '--write-auto-subs', '--skip-download', '--convert-subs', 'srt', '-o', dest, url];
  if (lang) args.splice(args.length - 1, 0, '--sub-langs', lang);
  await run(YTDLP, args);
  const files = fs.readdirSync(OUTPUT_DIR).filter((f) => f.startsWith(path.basename(dest)) && f.endsWith('.srt'));
  if (!files.length) throw new Error('Subtitle tidak tersedia untuk video ini');
  return path.join(OUTPUT_DIR, files[0]);
}

// Kompres video dengan ffmpeg (crf + preset)
async function compressVideo(inputFile, crf = 28, preset = 'medium') {
  const out = inputFile.replace(/\.(\w+)$/, '') + `-compressed-${crf}.mp4`;
  await run(FFMPEG, ['-y', '-i', inputFile, '-c:v', 'libx264', '-preset', preset, '-crf', String(crf), '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', out], 30 * 60 * 1000);
  return out;
}

// Pasang watermark teks (untuk user free)
async function addWatermark(inputFile) {
  const out = inputFile.replace(/\.(\w+)$/, '', ) + '-wm.mp4';
  const fontfile = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';
  const hasFont = fs.existsSync(fontfile);
  const drawtext = `drawtext=text='kongvid':fontsize=24:fontcolor=white@0.55:borderw=1:bordercolor=black@0.4:x=w-tw-20:y=h-th-20` + (hasFont ? `:fontfile=${fontfile}` : '');
  await run(FFMPEG, ['-y', '-i', inputFile, '-vf', drawtext, '-c:a', 'copy', out], 30 * 60 * 1000);
  return out;
}

function progressParser(child, onProgress) {
  child.stderr.on('data', (buf) => {
    const text = buf.toString();
    const m = text.match(/(\d+(?:\.\d+)?)%/g);
    if (m) onProgress(parseFloat(m[m.length - 1]));
  });
}

module.exports = { id, getInfo, downloadVideo, toMp3, getSubtitles, compressVideo, addWatermark, run, progressParser, OUTPUT_DIR };
