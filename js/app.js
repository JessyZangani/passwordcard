/**
 * Password Card - Logique principale
 * ===================================
 * Modules :
 *   CONFIG     - constantes partagees
 *   Charset    - construction du jeu de caracteres
 *   Card       - generation du tableau HTML
 *   Selection  - gestion des cellules selectionnees
 *   Legend     - legende des couleurs
 *   Toast      - notifications ephemeres
 *   Clipboard  - copie du mot de passe
 *   Chips      - synchronisation visuelle des toggles
 *   Init       - point d'entree
 */

'use strict';

/* ============================================================
   CONFIG
   ============================================================ */
const CONFIG = {
  colLabels : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
  colColors : [
    '#ff7b72', '#ffa657', '#e3b341', '#3fb950', '#58a6ff',
    '#bc8cff', '#ff7bbb', '#79c0ff', '#56d364', '#d2a8ff'
  ],
  charsets : {
    upper   : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    lower   : 'abcdefghijklmnopqrstuvwxyz',
    digits  : '0123456789',
    special : '!@#\$%&?*+-=^~'
  },
  animDelayMs : 6
};

/* ============================================================
   MODULE - Charset
   ============================================================ */
const Charset = (() => {
  function build() {
    const map = {
      upper   : '#chip-upper input',
      lower   : '#chip-lower input',
      digits  : '#chip-digits input',
      special : '#chip-special input'
    };
    let result = '';
    for (const [key, selector] of Object.entries(map)) {
      if (document.querySelector(selector)?.checked) {
        result += CONFIG.charsets[key];
      }
    }
    return result || CONFIG.charsets.upper + CONFIG.charsets.lower + CONFIG.charsets.digits;
  }

  return { build };
})();

/* ============================================================
   MODULE - Card
   ============================================================ */
const Card = (() => {
  function getDimensions() {
    return document.getElementById('sizeSelect').value.split('x').map(Number);
  }

  function _buildHeader(cols) {
    const thead = document.createElement('thead');
    const tr    = document.createElement('tr');

    const corner = document.createElement('th');
    corner.className = 'row-header';
    tr.appendChild(corner);

    for (let c = 0; c < cols; c++) {
      const th = document.createElement('th');
      th.className   = 'col-header col-' + (c % CONFIG.colColors.length);
      th.textContent = CONFIG.colLabels[c % CONFIG.colLabels.length];
      th.setAttribute('scope', 'col');
      tr.appendChild(th);
    }

    thead.appendChild(tr);
    return thead;
  }

  function _buildCell(char, row, col, animIndex) {
    const td = document.createElement('td');
    td.textContent = char;
    td.className   = 'col-' + (col % CONFIG.colColors.length) + ' animate-in';
    td.style.animationDelay = (animIndex * CONFIG.animDelayMs) + 'ms';
    td.dataset.row  = row;
    td.dataset.col  = col;
    td.dataset.char = char;
    td.setAttribute('title', 'Ligne ' + (row + 1) + ', Colonne ' + CONFIG.colLabels[col % CONFIG.colLabels.length]);
    return td;
  }

  function _buildBody(rows, cols, chars, onCellClick) {
    const tbody = document.createElement('tbody');

    for (let r = 0; r < rows; r++) {
      const tr = document.createElement('tr');

      const rh = document.createElement('th');
      rh.className   = 'row-header';
      rh.textContent = r + 1;
      rh.setAttribute('scope', 'row');
      tr.appendChild(rh);

      for (let c = 0; c < cols; c++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        const td   = _buildCell(char, r, c, r * cols + c);
        td.addEventListener('click', onCellClick);
        tr.appendChild(td);
      }

      tbody.appendChild(tr);
    }

    return tbody;
  }

  function generate(onCellClick) {
    const chars        = Charset.build();
    const [rows, cols] = getDimensions();
    const table        = document.getElementById('passwordCard');

    table.innerHTML = '';
    table.appendChild(_buildHeader(cols));
    table.appendChild(_buildBody(rows, cols, chars, onCellClick));

    Legend.build(cols);
  }

  return { generate };
})();

/* ============================================================
   MODULE - Selection
   ============================================================ */
const Selection = (() => {
  let _items = [];

  const _countEl   = () => document.getElementById('selectedCount');
  const _displayEl = () => document.getElementById('selectedDisplay');

  function _indexOf(row, col) {
    return _items.findIndex(s => s.row === row && s.col === col);
  }

  function _render() {
    const n = _items.length;
    if (!n) {
      _countEl().textContent   = 'Cliquez sur les cellules pour construire votre mot de passe';
      _displayEl().textContent = '';
      return;
    }
    _countEl().textContent   = n + ' caractere' + (n > 1 ? 's' : '') + ' selectionne' + (n > 1 ? 's' : '');
    _displayEl().textContent = _items.map(s => s.char).join('');
  }

  function toggle(e) {
    const td  = e.currentTarget;
    const row = +td.dataset.row;
    const col = +td.dataset.col;
    const idx = _indexOf(row, col);

    if (idx > -1) {
      _items.splice(idx, 1);
      td.classList.remove('highlighted');
    } else {
      _items.push({ row, col, char: td.dataset.char });
      td.classList.add('highlighted');
    }

    _render();
  }

  function clear() {
    document.querySelectorAll('#passwordCard td.highlighted')
      .forEach(td => td.classList.remove('highlighted'));
    _items = [];
    _render();
  }

  function reset() {
    _items = [];
    _render();
  }

  function getPassword() {
    return _items.map(s => s.char).join('');
  }

  return { toggle, clear, reset, getPassword };
})();

/* ============================================================
   MODULE - Legend
   ============================================================ */
const Legend = (() => {
  function build(cols) {
    const container = document.getElementById('legend');
    container.innerHTML = '';
    const n = Math.min(cols, CONFIG.colColors.length);

    for (let i = 0; i < n; i++) {
      const item = document.createElement('div');
      item.className = 'legend-item';

      const dot = document.createElement('div');
      dot.className = 'legend-dot';
      dot.style.background = CONFIG.colColors[i];

      const label = document.createElement('span');
      label.textContent = 'Col. ' + CONFIG.colLabels[i];

      item.appendChild(dot);
      item.appendChild(label);
      container.appendChild(item);
    }
  }

  return { build };
})();

/* ============================================================
   MODULE - Toast
   ============================================================ */
const Toast = (() => {
  let _timer;

  function show(message, duration) {
    duration = duration || 2500;
    const el = document.getElementById('toast');
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(_timer);
    _timer = setTimeout(() => el.classList.remove('show'), duration);
  }

  return { show };
})();

/* ============================================================
   MODULE - Clipboard
   ============================================================ */
const Clipboard = (() => {
  async function copy() {
    const pwd = Selection.getPassword();
    if (!pwd) { Toast.show('Rien a copier !'); return; }

    try {
      await navigator.clipboard.writeText(pwd);
      Toast.show('Mot de passe copie !');
    } catch {
      Toast.show('Impossible de copier - verifiez les permissions du navigateur.');
    }
  }

  return { copy };
})();

/* ============================================================
   MODULE - Chips
   ============================================================ */
const Chips = (() => {
  function init() {
    document.querySelectorAll('#charsetToggles .chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const cb = chip.querySelector('input');
        setTimeout(() => chip.classList.toggle('active', cb.checked), 0);
      });
    });
  }

  return { init };
})();

/* ============================================================
   Fonctions globales (appelees depuis le HTML via onclick)
   ============================================================ */
function generateCard() {
  Selection.reset();
  Card.generate(Selection.toggle);
}

function clearHighlight() {
  Selection.clear();
}

function copySelected() {
  Clipboard.copy();
}

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  Chips.init();
  generateCard();
});