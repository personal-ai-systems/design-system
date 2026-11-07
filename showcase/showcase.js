/* Showcase behaviour: theme switching and a local-only form.
 *
 * Deliberately small. No framework, no network, no storage, no analytics.
 * The page must remain readable and operable with this file blocked; the only
 * losses are the token value labels and the theme switch.
 */

(function () {
  'use strict';

  var root = document.documentElement;
  var THEME_ATTR = 'data-pas-theme';
  var COLORS = [
    'primary', 'on-primary', 'primary-container', 'on-primary-container',
    'secondary', 'on-secondary', 'tertiary', 'on-tertiary',
    'surface', 'on-surface', 'surface-container', 'on-surface-muted',
    'outline', 'error', 'on-error', 'focus',
    'primary-hover', 'surface-hover', 'success', 'warning', 'on-image', 'image-scrim'
  ];

  // Convert rgb()/rgba() to hex when the browser reports computed colours.
  function toHex(value) {
    var match = value.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i);
    if (!match) return value;
    return '#' + [match[1], match[2], match[3]].map(function (part) {
      var n = Math.round(Number(part));
      return (n < 16 ? '0' : '') + n.toString(16);
    }).join('');
  }

  function paintValues() {
    COLORS.forEach(function (role) {
      var target = document.querySelector('[data-role="' + role + '"]');
      if (!target) return;
      var value = getComputedStyle(root).getPropertyValue('--pas-color-' + role);
      if (value) target.textContent = toHex(value.trim()).toUpperCase();
    });
  }

  // --- theme switch ---------------------------------------------------
  var select = document.getElementById('theme');
  if (select) {
    select.addEventListener('change', function () {
      var choice = select.value;
      if (choice === 'auto') {
        root.removeAttribute(THEME_ATTR);
      } else {
        root.setAttribute(THEME_ATTR, choice);
      }
      paintValues();
    });
  }

  // --- local-only form ------------------------------------------------
  var form = document.getElementById('demo-form');
  var status = document.getElementById('form-status');
  if (form) {
    form.addEventListener('submit', function (event) {
      // Never leave the page: this form exists to show states, not to collect.
      event.preventDefault();
      if (status) status.hidden = false;
    });
    form.addEventListener('reset', function () {
      if (status) status.hidden = true;
    });
  }

  paintValues();

  // Keep the reported values honest if the OS theme changes underneath us.
  if (window.matchMedia) {
    var query = window.matchMedia('(prefers-color-scheme: dark)');
    var onChange = function () { paintValues(); };
    if (query.addEventListener) query.addEventListener('change', onChange);
    else if (query.addListener) query.addListener(onChange);
  }
})();
