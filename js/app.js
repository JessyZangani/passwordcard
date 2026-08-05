/**
 * Password Card – Logique principale
 * ===================================
 * Modules :
 *  - CONFIG      : constantes partagées
 *  - Charset     : construction du jeu de caractères selon les options
 *  - Card        : génération du tableau HTML
 *  - Selection   : gestion des cellules sélectionnées
 *  - Legend      : barre de légende des couleurs
 *  - Toast       : notifications éphémères
 *  - Clipboard   : copie du mot de passe
 *  - Chips       : synchronisation visuelle des toggles
 *  - Init        : point d'entrée
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
    special : '!@#$%&?*+-=^~'
  },
  animDelayMs : 6   // délai par cellule (ms) pour l'animation en cascade
};

/* ============================================================
   MODULE – Charset
   ============================================================ */
const Charset = (() => {
  /**
   * Construit la chaîne de caractères selon les cases cochées.
   * Repli sur l'alphabet complet si aucune option n'est sélectionnée.
   * @returns {string}
   */
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
   MODULE – Card
   ============================================================ */
const Card = (() => {
  /** Renvoie les dimensions [rows, cols] selon le select. */
  function getDimensions() {
    const value = document.getElementById('sizeSelect').value;
    return value.split('x').map(Number);
  }

  /** Crée la ligne d'en-têtes de colonnes (thead). */
  function _buildHeader(cols) {
    const thead = document.createElement('thead');
    const tr    = document.createElement('tr');

    // Cellule coin (vide)
    const corner = document.createElement('th');
    corner.className = 'row-header';
    tr.appendChild(corner);

    for (let c = 0; c < cols; c++) {
      const th = document.createElement('th');
      th.className   = `col-header col-${c % CONFIG.colColors.length}`;
      th.textContent = CONFIG.colLabels[c % CONFIG.colLabels.length];
      th.setAttribute('scope', 'col');
      tr.appendChild(th);
    }

    thead.appendChild(tr);
    return thead;
  }

  /** Crée une cellule de données <td>. */
  function _buildCell(char, row, col, animIndex) {
    const td = document.createElement('td');
    td.textContent = char;
    td.className   = `col-${col % CONFIG.colColors.length} animate-in`;
    td.style.animationDelay = `${animIndex * CONFIG.animDelayMs}ms`;

    // Données accessibles via dataset
    td.dataset.row  = row;
    td.dataset.col  = col;
    td.dataset.char = char;

    td.setAttribute(
      'title',
      `Ligne ${row + 1}, Colonne ${CONFIG.colLabels[col % CONFIG.colLabels.length]}`
    );

    return td;
  }

  /** Crée le corps du tableau (tbody). */
  function _buildBody(rows, cols, chars, onCellClick) {
    const tbody = document.createElement('tbody');

    for (let r = 0; r < rows; r++) {
      const tr = document.createElement('tr');

      // En-tête de ligne (numéro)
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

  /**
   * Génère et injecte la table complète dans #passwordCard.
   * @param {function} onCellClick - callback déclenché au clic sur une cellule
   */
  function generate(onCellClick) {
    const chars         = Charset.build();
    const [rows, cols]  = getDimensions();
    const table         = document.getElementById('passwordCard');

    table.innerHTML = '';
    table.appendChild(_buildHeader(cols));
    table.appendChild(_buildBody(rows, cols, chars, onCellClick));

    Legend.build(cols);
  }

  return { generate };
})();

/* ============================================================
   MODULE – Selection
   ============================================================ */
const Selection = (() => {
  /** @type {Array<{row: number, col: number, char: string}>} */
  let _items = [];

  const _countEl   = () => document.getElementById('selectedCount');
  const _displayEl = () => document.getElementById('selectedDisplay');

  /** Trouve l'index d'un item par coordonnées. */
  function _indexOf(row, col) {
    return _items.findIndex(s => s.row === row && s.col === col);
  }

  /** Met à jour l'affichage du mot de passe construit. */
  function _render() {
    const n = _items.length;
    if (!n) {
      _countEl().textContent   = 'Cliquez sur les cellules pour construire votre mot de passe';
      _displayEl().textContent = '';
      return;
    }
    _countEl().textContent   = `${n} caractère${n > 1 ? 's' : ''} sélectionné${n > 1 ? 's' : ''}`;
    _displayEl().textContent = _items.map(s => s.char).join('');
  }

  /**
   * Gère le clic sur une cellule : toggle selection.
   * @param {MouseEvent} e
   */
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

  /** Efface toute la sélection. */
  function clear() {
    document.querySelectorAll('#passwordCard td.highlighted')
      .forEach(td => td.classList.remove('highlighted'));
    _items = [];
    _render();
  }

  /** Réinitialise l'état (sans toucher au DOM, pour la régénération). */
  function reset() {
    _items = [];
    _render();
  }

  /** Retourne le mot de passe sous forme de chaîne. */
  function getPassword() {
    return _items.map(s => s.char).join('');
  }

  return { toggle, clear, reset, getPassword };
})();

/* ============================================================
   MODULE – Legend
   ============================================================ */
const Legend = (() => {
  /**
   * Reconstruit la légende des couleurs de colonnes.
   * @param {number} cols - nombre de colonnes de la carte
   */
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
      label.textContent = `Col. ${CONFIG.colLabels[i]}`;

      item.appendChild(dot);
      item.appendChild(label);
      container.appendChild(item);
    }
  }

  return { build };
})();

/* ============================================================
   MODULE – Toast
   ============================================================ */
const Toast = (() => {
  let _timer;

  /**
   * Affiche une notification éphémère.
   * @param {string} message
   * @param {number} [duration=2500] - durée en ms
   */
  function show(message, duration = 2500) {
    const el = document.getElementById('toast');
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(_timer);
    _timer = setTimeout(() => el.classList.remove('show'), duration);
  }

  return { show };
})();

/* ============================================================
   MODULE – Clipboard
   ============================================================ */
const Clipboard = (() => {
  /** Copie le mot de passe sélectionné dans le presse-papiers. */
  async function copy() {
    const pwd = Selection.getPassword();
    if (!pwd) { Toast.show('Rien à copier !'); return; }

    try {
      await navigator.clipboard.writeText(pwd);
      Toast.show('✅ Mot de passe copié !');
    } catch {
      Toast.show('⚠️ Impossible de copier – vérifiez les permissions du navigateur.');
    }
  }

  return { copy };
})();

/* ============================================================
   MODULE – Chips (toggles de charset)
   ============================================================ */
const Chips = (() => {
  /** Synchronise la classe .active avec l'état de la checkbox. */
  function init() {
    document.querySelectorAll('#charsetToggles .chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const cb = chip.querySelector('input');
        // La case à cocher est mise à jour par le navigateur avant le click
        // mais l'état exact est assuré avec un léger délai
        setTimeout(() => chip.classList.toggle('active', cb.checked), 0);
      });
    });
  }

  return { init };
})();

/* ============================================================
   Fonctions globales (appelées depuis le HTML via onclick)
   ============================================================ */

/** Régénère la carte et réinitialise la sélection. */
function generateCard() {
  Selection.reset();
  Card.generate(Selection.toggle);
}

/** Efface la sélection de cellules. */
function clearHighlight() {
  Selection.clear();
}

/** Copie le mot de passe dans le presse-papiers. */
function copySelected() {
  Clipboard.copy();
}

/* ============================================================
   INIT – Point d'entrée
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  Chips.init();
  generateCard();
});
