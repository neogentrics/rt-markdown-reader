// The toolbar you control (3.14): hide, reorder and shrink the buttons on the right, show names beside the icons, and
// keep every button reachable in a narrow window. Buttons that don't fit move into a "More" menu. Anything hidden stays
// in the menus and in Ctrl+K.
//
// Three things can take a button off the bar, each with its own mark so they never undo each other: the app itself
// (`hidden`: no document yet), your choice (`data-off`) and a lack of room (`data-overflow`).
import { TOOLS, DEFAULT_TOOLBAR, orderOf, cleanToolbar } from '../main/toolbar-tools.js';

const TITLE_ROOM = 150;        // the most the document's title is given before buttons move to "More"

export function createToolbarUi({ api, settings, openPreferences }) {
  const $ = (id) => document.getElementById(id);
  const bar = $('toolbar');
  const right = bar.querySelector('.tb-right');
  const title = $('doc-title');
  const more = $('tb-more');
  const moreButton = $('btn-more');
  const moreMenu = $('more-menu');
  const dlg = $('toolbar-dlg');
  const byId = new Map(TOOLS.map((t) => [t.id, t]));
  // What moves for each tool: its button, or the box that holds the button and its pop-up.
  const elementOf = (tool) => $(tool.button).closest('.tb-menu-wrap') || $(tool.button);
  let current = cleanToolbar(DEFAULT_TOOLBAR);
  let waiting = 0;

  // ---------------------------------------------------------------- the bar
  function apply(saved) {
    current = cleanToolbar(saved);
    const order = orderOf(current.order);
    // Move only what's out of place: this runs after every settings change, and moving a button, even to where it
    // already is, would take the keyboard off it (pressing "Larger" is itself a settings change).
    let after = more;
    for (const id of [...order].reverse()) {
      const element = elementOf(byId.get(id));
      if (element.nextElementSibling !== after) right.insertBefore(element, after);
      after = element;
    }
    for (const tool of TOOLS) {
      const element = elementOf(tool);
      element.toggleAttribute('data-off', current.hidden.includes(tool.id));
      const button = $(tool.button);
      let name = button.querySelector('.tb-name');
      if (tool.id === 'edit') continue;                 // Edit always says what it does
      if (current.labels && !name) {
        name = document.createElement('span');
        name.className = 'tb-name';
        name.textContent = tool.name;
        button.append(name);
      } else if (!current.labels) name?.remove();
    }
    right.classList.toggle('compact', current.small);
    right.classList.toggle('named', current.labels);
    if (dlg.open) paintDialog();
    later();
  }

  const onBar = (element) => !element.hidden && element.getClientRects().length > 0;

  /** Does everything on the bar fit, with room left for the title? */
  function fits() {
    const words = title.querySelector('.tb-title-name');
    const wanted = Math.min(TITLE_ROOM, (words?.scrollWidth || 0) + 24);
    return right.getBoundingClientRect().right <= bar.getBoundingClientRect().right - 4 && title.getBoundingClientRect().width >= wanted - 1;
  }

  /** Move buttons that don't fit into "More", from the end of your order. Edit and the apps button stay. */
  function layout() {
    waiting = 0;
    for (const element of right.querySelectorAll('[data-overflow]')) element.removeAttribute('data-overflow');
    more.hidden = true;
    closeMore();
    if (fits()) return;
    more.hidden = false;
    const movable = orderOf(current.order).map((id) => elementOf(byId.get(id))).reverse();
    for (const element of movable) {
      if (fits()) break;
      if (!onBar(element) || element.hasAttribute('data-reveal')) continue;
      element.setAttribute('data-overflow', '');
    }
    if (!right.querySelector('[data-overflow]')) more.hidden = true;
  }
  function later() { if (!waiting) waiting = requestAnimationFrame(layout); }

  new ResizeObserver(later).observe(bar);
  // The app shows and hides buttons as documents come and go, and the title changes length.
  new MutationObserver((changes) => {
    if (changes.some((c) => !more.contains(c.target) && !c.target.closest?.('.popover'))) later();
  }).observe(right, { subtree: true, attributes: true, attributeFilter: ['hidden'] });
  new MutationObserver(later).observe(title, { subtree: true, childList: true, characterData: true });
  document.fonts?.ready.then(later);

  /** For the tutorial: show this button, wherever it was, until `reveal(null)`. */
  function reveal(selector) {
    const button = selector ? document.querySelector(selector) : null;
    const wanted = TOOLS.find((t) => button && t.button === button.id);
    let changed = false;
    for (const tool of TOOLS) {
      const element = elementOf(tool);
      const show = tool === wanted;
      if (element.hasAttribute('data-reveal') !== show) { element.toggleAttribute('data-reveal', show); changed = true; }
    }
    if (changed) layout();
  }

  // ---------------------------------------------------------------- More
  function closeMore() {
    if (moreMenu.hidden) return;
    moreMenu.hidden = true;
    moreButton.setAttribute('aria-expanded', 'false');
  }

  function openMore() {
    const rows = orderOf(current.order).map((id) => byId.get(id)).filter((tool) => elementOf(tool).hasAttribute('data-overflow')).map((tool) => {
      const real = $(tool.button);
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'more-item';
      row.dataset.tool = tool.id;
      row.disabled = real.disabled;
      const icon = real.querySelector('svg')?.cloneNode(true);
      if (icon) row.append(icon);
      const name = document.createElement('span');
      name.textContent = tool.name;
      row.append(name);
      row.onclick = (e) => {
        e.stopPropagation();
        closeMore();
        // The theme pop-up hangs from its own button, which isn't on the bar: Preferences has the same choices.
        if (tool.id === 'theme') openPreferences('appearance');
        else real.click();
      };
      return row;
    });
    moreMenu.replaceChildren(...rows);
    moreMenu.hidden = false;
    moreButton.setAttribute('aria-expanded', 'true');
    rows.find((r) => !r.disabled)?.focus();
  }

  moreButton.onclick = (e) => { e.stopPropagation(); if (moreMenu.hidden) openMore(); else closeMore(); };
  document.addEventListener('click', (e) => { if (!moreMenu.hidden && !more.contains(e.target)) closeMore(); });
  more.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || moreMenu.hidden) return;
    e.stopPropagation();
    closeMore();
    moreButton.focus();
  });

  // ---------------------------------------------------------------- Customize Toolbar
  const save = (patch) => {
    const next = cleanToolbar({ ...current, ...patch });
    apply(next);                                            // at once; the saved setting comes back the same
    api.setSettings({ toolbar: next });
  };

  function move(id, by) {
    const order = orderOf(current.order);
    const at = order.indexOf(id);
    const to = at + by;
    if (to < 0 || to >= order.length) return;
    order.splice(to, 0, ...order.splice(at, 1));
    save({ order });
  }

  function paintDialog() {
    const list = $('toolbar-list');
    const focused = list.contains(document.activeElement) ? document.activeElement.dataset.key : null;
    const order = orderOf(current.order);
    const tools = [byId.get('edit'), ...order.map((id) => byId.get(id)), byId.get('apps')];
    list.replaceChildren(...tools.map((tool) => {
      const item = document.createElement('li');
      item.dataset.tool = tool.id;
      const label = document.createElement('label');
      label.className = 'check';
      const box = document.createElement('input');
      box.type = 'checkbox';
      box.checked = !current.hidden.includes(tool.id);
      box.dataset.key = `${tool.id}:show`;
      box.onchange = () => save({ hidden: box.checked ? current.hidden.filter((h) => h !== tool.id) : [...current.hidden, tool.id] });
      const name = document.createElement('span');
      name.textContent = tool.name;
      label.append(box, name);
      item.append(label);
      if (!tool.fixed) {
        const at = order.indexOf(tool.id);
        name.id = `toolbar-name-${tool.id}`;
        // "Move up", and a screen reader then says which button: each part is translated on its own.
        for (const [by, words, spoken] of [[-1, 'Up', 'Move up'], [1, 'Down', 'Move down']]) {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'link-btn';
          button.textContent = words;
          button.setAttribute('aria-label', spoken);
          button.setAttribute('aria-describedby', name.id);
          button.dataset.key = `${tool.id}:${words}`;
          button.disabled = by < 0 ? at === 0 : at === order.length - 1;
          button.onclick = () => move(tool.id, by);
          item.append(button);
        }
      }
      return item;
    }));
    $('toolbar-small').checked = current.small;
    $('toolbar-labels').checked = current.labels;
    if (focused) {
      const again = list.querySelector(`[data-key="${focused}"]`);
      // A button that has reached the end can't be pressed: keep the keyboard on that row.
      if (again && !again.disabled) again.focus();
      else list.querySelector(`li[data-tool="${focused.split(':')[0]}"] :is(button:not(:disabled), input)`)?.focus();
    }
  }

  function customize() {
    closeMore();
    paintDialog();
    if (!dlg.open) dlg.showModal();
  }

  $('toolbar-small').onchange = () => save({ small: $('toolbar-small').checked });
  $('toolbar-labels').onchange = () => save({ labels: $('toolbar-labels').checked });
  $('toolbar-reset').onclick = () => save({ ...DEFAULT_TOOLBAR });
  for (const id of ['toolbar-close', 'toolbar-done']) $(id).onclick = () => dlg.close();
  right.addEventListener('contextmenu', (e) => { if (!e.target.closest('.popover')) { e.preventDefault(); customize(); } });

  apply(settings()?.toolbar);
  return { apply, customize, reveal, layout };
}
