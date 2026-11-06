const root = document.documentElement;
const direction = root.dataset.previewTheme;
document.querySelector(`[data-direction="${direction}"]`)?.setAttribute('aria-current', 'page');

const stories = [
  ['For travel creators', 'The places you almost kept to yourself.', 'Turn a weekend away into a short reel and a longer, more personal story. The location, the little discoveries, the things you would tell a friend.', '“Not another hotel tour. The bit that made us want to stay.”', '70% center'],
  ['For independent brands', 'A small business. A story worth telling.', 'Bring the experience behind your product into focus. Shape a considered brand story from your own footage and the details only you can tell.', '“The view is beautiful. The people behind the place make the story.”', '20% center'],
  ['For multilingual storytellers', 'More languages. The same point of view.', 'The planned voice workflow pairs reviewed translation with an approved voice. Keep control of meaning, delivery and what is ultimately shared.', '“Tell it naturally. Make space for a different audience.”', '90% center'],
];
let currentStory = 0;
const showStory = (next) => {
  currentStory = (next + stories.length) % stories.length;
  const [category, title, copy, quote, position] = stories[currentStory];
  for (const [id, text] of Object.entries({ 'story-category': category, 'story-title': title, 'story-copy': copy, 'story-quote': quote })) document.getElementById(id).textContent = text;
  document.getElementById('story-count').textContent = `0${currentStory + 1} / 03`;
  document.querySelector('.story-photo img').style.objectPosition = position;
  document.querySelectorAll('[data-story]').forEach((button) => button.setAttribute('aria-pressed', String(Number(button.dataset.story) === currentStory)));
};
document.getElementById('next-story').addEventListener('click', () => showStory(currentStory + 1));
document.getElementById('previous-story').addEventListener('click', () => showStory(currentStory - 1));
document.querySelectorAll('[data-story]').forEach((button) => button.addEventListener('click', () => showStory(Number(button.dataset.story))));
document.querySelector('.story-slide').addEventListener('keydown', (event) => {
  if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); showStory(currentStory + (event.key === 'ArrowRight' ? 1 : -1)); }
});
document.getElementById('interest-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const result = document.getElementById('form-result');
  result.hidden = false;
  result.textContent = 'Preview complete. Nothing was sent or stored. Use “Get in touch” to contact us by email.';
});

const dialog = document.getElementById('palette-dialog');
const editable = { primary: 'Primary action', 'on-primary': 'Action text', surface: 'Page background', 'on-surface': 'Main text', 'surface-container': 'Section background', 'primary-container': 'Feature background', 'on-primary-container': 'Feature text', tertiary: 'Accent', 'on-surface-muted': 'Secondary text' };
const original = Object.fromEntries(Object.keys(editable).map((role) => [role, getComputedStyle(root).getPropertyValue(`--pas-color-${role}`).trim()]));
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
  for (const [role, value] of Object.entries(original)) { values[role] = value; root.style.removeProperty(`--pas-color-${role}`); document.querySelector(`[data-role="${role}"]`).value = value; }
  updateContrast();
});
document.getElementById('export-colours').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify({ name: `Creator Flow / ${direction}`, status: 'review-proposal', baseVersion: '0.1.0', colorRoles: values }, null, 2) + '\n'], { type: 'application/json' });
  const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `creator-flow-${direction}-palette.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
});
