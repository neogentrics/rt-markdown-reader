'use strict';
// The toolbar you control (3.14): the buttons on the right of the toolbar that can be hidden, reordered and named. The
// page and the settings both use this list, so keep it free of Node APIs.
//
//  - name     shown beside the icon when "names beside icons" is on, and in the lists. In every language it's part of
//             the button's spoken name, so voice control can use what's on screen.
//  - command  the menu command that does the same, so a hidden button is still in the menus and in Ctrl+K.
//  - fixed    keeps its place ('start' beside Save, 'end' at the right end): it can be hidden, not moved.
// Save isn't here: it only appears when there's something to save, and always stays.

const TOOLS = [
  { id: 'edit', button: 'btn-edit', name: 'Edit', command: 'toggle-edit', fixed: 'start' },
  { id: 'bookmark', button: 'btn-bookmark', name: 'Bookmark', command: 'bookmark' },
  { id: 'quick', button: 'btn-quick', name: 'Go to', command: 'quick-open' },
  { id: 'split', button: 'btn-split', name: 'Split view', command: 'split-toggle' },
  { id: 'find', button: 'btn-find', name: 'Find', command: 'find' },
  { id: 'read', button: 'btn-read', name: 'Read Aloud', command: 'read-aloud' },
  { id: 'smaller', button: 'btn-smaller', name: 'Smaller', command: 'text-smaller' },
  { id: 'larger', button: 'btn-larger', name: 'Larger', command: 'text-larger' },
  { id: 'theme', button: 'btn-theme', name: 'Theme', command: 'theme-system' },
  { id: 'present', button: 'btn-present', name: 'Present', command: 'present' },
  { id: 'export', button: 'btn-pdf', name: 'Export', command: 'export-pdf' },
  { id: 'print', button: 'btn-print', name: 'Print', command: 'print' },
  { id: 'prefs', button: 'btn-prefs', name: 'Preferences', command: 'preferences' },
  { id: 'help', button: 'btn-help', name: 'Help', command: 'help-center' },
  { id: 'apps', button: 'btn-apps', name: 'Apps', command: 'apps', fixed: 'end' },
];

const IDS = TOOLS.map((t) => t.id);
const MOVABLE = TOOLS.filter((t) => !t.fixed).map((t) => t.id);
const DEFAULT_TOOLBAR = Object.freeze({ order: [], hidden: [], small: false, labels: false });

/** The movable buttons in the person's order. Ones they've never placed (new in an update) come where they would by default. */
function orderOf(saved = []) {
  const order = [...new Set(saved.filter((id) => MOVABLE.includes(id)))];
  for (const [i, id] of MOVABLE.entries()) {
    if (order.includes(id)) continue;
    // After the nearest button before it by default that's already placed.
    const before = MOVABLE.slice(0, i).reverse().find((b) => order.includes(b));
    order.splice(before ? order.indexOf(before) + 1 : 0, 0, id);
  }
  return order;
}

/** A safe copy of the saved toolbar settings, whatever was in the file. */
function cleanToolbar(input) {
  const t = input && typeof input === 'object' ? input : {};
  const list = (v, known) => (Array.isArray(v) ? [...new Set(v.filter((id) => known.includes(id)))] : []);
  return { order: list(t.order, MOVABLE), hidden: list(t.hidden, IDS), small: t.small === true, labels: t.labels === true };
}

module.exports = { TOOLS, IDS, MOVABLE, DEFAULT_TOOLBAR, orderOf, cleanToolbar };
