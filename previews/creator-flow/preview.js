const root = document.documentElement;
const reviewMode = new URLSearchParams(window.location.search).get('review') === '1';
const direction = root.dataset.previewTheme;
document.querySelector('.review-strip').hidden = !reviewMode;
document.querySelector(`[data-direction="${direction}"]`)?.setAttribute('aria-current', 'page');
if (reviewMode) document.querySelector('meta[name="robots"]')?.setAttribute('content', 'noindex, follow');

document.getElementById('interest-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const body = [
    'Hello Personal AI Systems,',
    '',
    'I would like to discuss Creator Flow early access.',
    '',
    `Name: ${data.get('name') || 'Not provided'}`,
    `I create for: ${data.get('audience')}`,
    '',
    String(data.get('message') || ''),
  ].join('\n');
  const query = new URLSearchParams({ subject: 'Creator Flow early-access enquiry', body });
  document.getElementById('enquiry-link').href = `mailto:kirill@consens.com.au?${query}`;
  document.getElementById('enquiry-copy').value = body;
  document.getElementById('form-result').hidden = false;
});
// Keep all successful controls disabled if the no-send handler never loads.
document.getElementById('enquiry-fields').disabled = false;

const stories = document.querySelector('.story-carousel');
if (stories) {
  const slides = [...stories.querySelectorAll('.story-slide')];
  const previous = document.getElementById('story-prev');
  const next = document.getElementById('story-next');
  const position = document.getElementById('story-position');
  const audio = document.getElementById('story-audio');
  const play = document.getElementById('story-play');
  const stop = document.getElementById('story-stop');
  const audioStatus = document.getElementById('story-audio-status');
  const speech = window.speechSynthesis;
  let current = 0;
  let utterance;
  const availableVoices = () => speech?.getVoices().filter(voice => voice.localService && /^en(?:-|_)/i.test(voice.lang)) ?? [];
  const resetAudio = () => {
    if (utterance) {
      utterance.onend = utterance.onerror = null;
      utterance = undefined;
      speech.cancel();
    }
    play.disabled = false;
    stop.disabled = true;
    audioStatus.textContent = 'Local device voice, not ElevenLabs.';
  };
  const show = index => {
    current = index;
    resetAudio();
    slides.forEach((slide, i) => { slide.hidden = i !== current; });
    position.textContent = `${current + 1} / ${slides.length}`;
    previous.disabled = current === 0;
    next.disabled = current === slides.length - 1;
  };
  previous.addEventListener('click', () => { if (current > 0) show(current - 1); });
  next.addEventListener('click', () => { if (current < slides.length - 1) show(current + 1); });
  document.getElementById('story-nav').hidden = false;
  show(0);
  if (speech && typeof window.SpeechSynthesisUtterance === 'function') {
    const updateAvailability = () => { audio.hidden = availableVoices().length === 0; };
    speech.addEventListener('voiceschanged', updateAvailability);
    updateAvailability();
    play.addEventListener('click', () => {
      const voices = availableVoices();
      if (!voices.length || utterance) return;
      utterance = new window.SpeechSynthesisUtterance(slides[current].querySelector('blockquote').textContent);
      utterance.voice = voices[current % voices.length];
      utterance.lang = utterance.voice.lang;
      utterance.rate = [0.95, 0.88, 1][current];
      utterance.onend = resetAudio;
      utterance.onerror = () => { resetAudio(); audioStatus.textContent = 'This device could not play the sample.'; };
      play.disabled = true;
      stop.disabled = false;
      speech.speak(utterance);
    });
    stop.addEventListener('click', resetAudio);
    window.addEventListener('pagehide', resetAudio);
  }
}

if (reviewMode) {
const dialog = document.getElementById('palette-dialog');
const editable = { primary: 'Primary action', 'on-primary': 'Action text', surface: 'Page background', 'on-surface': 'Main text', 'surface-container': 'Section background', 'primary-container': 'Feature background', 'on-primary-container': 'Feature text', tertiary: 'Accent', 'on-surface-muted': 'Secondary text' };
const allRoles = ['primary', 'on-primary', 'primary-container', 'on-primary-container', 'secondary', 'on-secondary', 'tertiary', 'on-tertiary', 'surface', 'on-surface', 'surface-container', 'on-surface-muted', 'outline', 'error', 'on-error', 'focus', 'primary-hover', 'surface-hover', 'success', 'warning', 'on-image', 'image-scrim'];
const original = Object.fromEntries(allRoles.map((role) => [role, getComputedStyle(root).getPropertyValue(`--pas-color-${role}`).trim()]));
const values = { ...original };
function luminance(hex) {
  const rgb = hex.replace('#', '').match(/../g).map((v) => parseInt(v, 16) / 255).map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}
function updateContrast() {
  const pairs = [['Primary action', 'primary', 'on-primary'], ['Main text', 'surface', 'on-surface'], ['Secondary text', 'surface', 'on-surface-muted'], ['Feature text', 'primary-container', 'on-primary-container']];
  const results = pairs.map(([label, background, text]) => { const a = luminance(values[background]); const b = luminance(values[text]); const ratio = (Math.max(a,b) + .05) / (Math.min(a,b) + .05); return `${label}: ${ratio.toFixed(1)}:1${ratio < 4.5 ? ' — below 4.5:1' : ''}`; });
  document.getElementById('contrast-status').textContent = results.join(' · ');
}
for (const [role, label] of Object.entries(editable)) {
  const field = document.createElement('label'); field.append(document.createTextNode(label));
  const input = document.createElement('input'); input.type = 'color'; input.value = original[role]; input.dataset.role = role;
  input.addEventListener('input', () => { values[role] = input.value; root.style.setProperty(`--pas-color-${role}`, input.value); updateContrast(); });
  field.append(input); document.getElementById('colour-controls').append(field);
}
document.getElementById('open-palette').addEventListener('click', () => { updateContrast(); dialog.showModal(); });
dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
document.getElementById('reset-colours').addEventListener('click', () => {
  for (const [role, value] of Object.entries(original)) { values[role] = value; root.style.removeProperty(`--pas-color-${role}`); const input = document.querySelector(`[data-role="${role}"]`); if (input) input.value = value; }
  document.getElementById('palette-output').hidden = true;
  updateContrast();
});
document.getElementById('export-colours').addEventListener('click', () => {
  const json = JSON.stringify({ name: `Creator Flow / ${direction}`, status: 'review-proposal', baseVersion: '0.1.0', colorRoles: values }, null, 2) + '\n';
  document.getElementById('palette-json').value = json;
  document.getElementById('palette-output').hidden = false;
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `creator-flow-${direction}-palette.json`; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
});
}
