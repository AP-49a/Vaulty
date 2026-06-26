/* Vaultly password generator: no dependencies, secure browser randomness. */
const chars = {
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', lowercase: 'abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789', symbols: '!@#$%^&*_-+=?|'
};
const similarChars = /[Il1O0]/g;
const ambiguousChars = /[{}\[\]()\\/'`~,;:.<>]/g;
const $ = (selector) => document.querySelector(selector);
const form = $('#generatorForm'), output = $('#passwordOutput'), lengthRange = $('#lengthRange');
const selections = ['uppercase', 'lowercase', 'numbers', 'symbols'];
let history = JSON.parse(localStorage.getItem('vaultlyHistory') || '[]');
let toastTimeout;

function secureIndex(max) {
  const range = 0x100000000, limit = range - (range % max);
  const value = new Uint32Array(1);
  do crypto.getRandomValues(value); while (value[0] >= limit);
  return value[0] % max;
}
function shuffle(items) { for (let i = items.length - 1; i > 0; i--) { const j = secureIndex(i + 1); [items[i], items[j]] = [items[j], items[i]]; } return items; }
function selectedSets() {
  const excludeSimilar = form.elements.excludeSimilar.checked, excludeAmbiguous = form.elements.excludeAmbiguous.checked;
  return selections.filter(name => form.elements[name].checked).map(name => {
    let set = chars[name]; if (excludeSimilar) set = set.replace(similarChars, ''); if (excludeAmbiguous && name === 'symbols') set = set.replace(ambiguousChars, '');
    return set;
  }).filter(Boolean);
}
function calculateStrength(length, types) {
  const score = (length >= 12 ? 1 : 0) + (length >= 20 ? 1 : 0) + (types >= 3 ? 1 : 0) + (types === 4 ? 1 : 0);
  return score <= 1 ? ['weak', 'Weak', 'Add length and more character types.'] : score <= 3 ? ['medium', 'Medium', 'A solid start — add another type for stronger protection.'] : ['strong', 'Strong', 'Excellent variety and complexity.'];
}
function updateStrength() {
  const length = +lengthRange.value, types = selectedSets().length, [level, label, hint] = calculateStrength(length, types);
  const meter = $('.strength-meter'); meter.dataset.strength = level; meter.setAttribute('aria-valuenow', level === 'weak' ? 1 : level === 'medium' ? 2 : 3);
  $('#strengthText').textContent = label; $('#strengthText').dataset.strength = level; $('#strengthHint').textContent = types ? hint : 'Select at least one character type.';
}
function showToast(message = 'Copied to clipboard!') { $('#toastText').textContent = message; $('#toast').classList.add('show'); clearTimeout(toastTimeout); toastTimeout = setTimeout(() => $('#toast').classList.remove('show'), 2200); }
function renderHistory() {
  const list = $('#historyList'); list.innerHTML = ''; $('#emptyHistory').hidden = history.length > 0;
  history.forEach(password => { const item = document.createElement('li'), button = document.createElement('button'); button.className = 'history-item'; button.type = 'button'; button.textContent = password; button.title = 'Copy this password'; button.addEventListener('click', () => copyText(password)); item.append(button); list.append(item); });
}
function addHistory(password) { history = [password, ...history.filter(item => item !== password)].slice(0, 10); localStorage.setItem('vaultlyHistory', JSON.stringify(history)); renderHistory(); }
function generatePassword() {
  const sets = selectedSets(); const error = $('#errorMessage');
  if (!sets.length) { error.textContent = 'Choose at least one character type to generate a password.'; output.value = ''; updateStrength(); return; }
  error.textContent = ''; const length = +lengthRange.value; const password = sets.map(set => set[secureIndex(set.length)]);
  const all = sets.join(''); while (password.length < length) password.push(all[secureIndex(all.length)]);
  output.value = shuffle(password).join(''); output.type = 'text'; $('#visibilityToggle').setAttribute('aria-label', 'Hide password'); addHistory(output.value); updateStrength();
}
async function copyText(text = output.value) {
  if (!text) return; try { await navigator.clipboard.writeText(text); } catch { output.focus(); output.select(); document.execCommand('copy'); output.setSelectionRange(0, 0); } showToast('Copied to clipboard!');
}
function downloadHistory() { if (!history.length) return showToast('No history to download yet.'); const blob = new Blob([history.join('\n') + '\n'], { type: 'text/plain' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'vaultly-password-history.txt'; link.click(); URL.revokeObjectURL(link.href); showToast('History downloaded!'); }
function setTheme(dark) { document.body.classList.toggle('dark', dark); $('#themeToggle').setAttribute('aria-pressed', dark); $('#themeToggle').setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} mode`); $('.theme-icon').textContent = dark ? '☀' : '☾'; localStorage.setItem('vaultlyTheme', dark ? 'dark' : 'light'); }

lengthRange.addEventListener('input', () => { $('#lengthValue').value = lengthRange.value; $('#lengthValue').textContent = lengthRange.value; updateStrength(); });
form.addEventListener('change', updateStrength); form.addEventListener('submit', event => { event.preventDefault(); generatePassword(); });
$('#copyButton').addEventListener('click', () => copyText()); $('#regenerateButton').addEventListener('click', generatePassword);
$('#visibilityToggle').addEventListener('click', () => { const hidden = output.type === 'password'; output.type = hidden ? 'text' : 'password'; $('#visibilityToggle').setAttribute('aria-label', hidden ? 'Hide password' : 'Show password'); });
$('#themeToggle').addEventListener('click', () => setTheme(!document.body.classList.contains('dark'))); $('#clearHistory').addEventListener('click', () => { history = []; localStorage.removeItem('vaultlyHistory'); renderHistory(); showToast('History cleared.'); }); $('#downloadHistory').addEventListener('click', downloadHistory);
output.addEventListener('keydown', event => { if (event.ctrlKey && event.key.toLowerCase() === 'c') { event.preventDefault(); copyText(); } });
document.addEventListener('keydown', event => { if (event.code === 'Space' && !['INPUT', 'BUTTON'].includes(document.activeElement.tagName)) { event.preventDefault(); generatePassword(); } });
setTheme(localStorage.getItem('vaultlyTheme') === 'dark' || (!localStorage.getItem('vaultlyTheme') && matchMedia('(prefers-color-scheme: dark)').matches)); renderHistory(); generatePassword();
