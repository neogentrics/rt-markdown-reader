// Your apps at a glance (3.14): the Apps panel and the toolbar's dot. Every Recon Towers app, whether it's linked, found,
// installed or not there at all, and the one button that goes with each. The same panel is in Preferences → Linked Apps
// and behind the toolbar button. The words come from ../main/suite-apps.js, which every app copies.
//
// It looks when the app starts, when the panel opens, when Refresh is pressed and when a link changes: never on a timer.
// Finding an app never links it.
import { STATES, TITLE, UPDATE, DOTS } from '../main/suite-apps.js';

const el = (tag, props = {}, ...children) => {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === 'onclick') node.onclick = value;
    else if (value !== null && value !== undefined) node.setAttribute(key, value);
  }
  node.append(...children.filter((c) => c !== null && c !== undefined && c !== false));
  return node;
};
/** Text that isn't ours to translate: an app's name, its version, or what another app says. */
const asIs = (tag, text, className) => el(tag, { translate: 'no', ...(className ? { class: className } : {}) }, text);

export function createAppsUi({ api, toast, openPreferences = null }) {
  const $ = (id) => document.getElementById(id);
  const dlg = $('apps-dlg');
  // The two places the panel is shown.
  const views = [
    { list: $('apps-list'), note: $('apps-note'), off: $('apps-off'), visible: () => dlg.open },
    { list: $('pref-link-list'), note: $('pref-link-status'), toggle: $('pref-link'), visible: () => $('prefs-dlg').open },
  ];
  let asked = 0;
  let shown = 0;

  function paintDot(status) {
    const button = $('btn-apps');
    const words = `${TITLE}: ${DOTS[status.dot]}`;
    button.querySelector('.apps-dot').dataset.dot = status.dot;
    button.title = words;
    button.setAttribute('aria-label', words);
  }

  const button = (label, aria, onclick, className = 'link-btn') => el('button', { type: 'button', class: className, 'aria-label': aria, onclick }, label);

  function row(view, item, status) {
    const say = (text) => { view.note.textContent = text; };
    const open = async () => {
      const res = await api.appsOpen(item.id);
      if (res?.error) { say(res.error); return; }
      say(`Starting ${item.name}…`);
      setTimeout(() => look('quiet'), 4000);          // it takes a few seconds to come up: one more look, because you asked
    };
    const get = async () => { const res = await api.appsGet(item.id); if (res?.error) say(res.error); };
    const link = async () => {
      say(`Answer in ${item.name}`);
      const res = await api.linkPair(item.id);
      if (res?.error) toast(res.error);
      await look('quiet');
    };
    const unlink = async () => { await api.linkUnlink(item.id); await look('quiet'); };
    const updateOpens = item.update?.action === 'open' && item.canOpen;
    const buttons = [
      item.canOpen && !updateOpens ? button(STATES.linked.button, `Open ${item.name}`, open) : null,
      item.canLink && status.on ? button(STATES.found.button, `Link ${item.name}`, link) : null,
      updateOpens ? button(UPDATE.open, `Open to update: ${item.name}`, open) : null,
      item.update?.action === 'download' && item.known ? button(UPDATE.download, `Download ${item.name}`, get) : null,
      item.canGet ? button(STATES.missing.button, `Get it: ${item.name}`, get) : null,
      item.linked ? button('Remove', `Remove the link to ${item.name}`, unlink) : null,
    ].filter(Boolean);
    return el('li', { class: 'app-row', 'data-app': item.id, 'data-state': item.state },
      el('div', { class: 'app-info' },
        el('span', { class: 'app-name' }, asIs('strong', item.name), item.version ? asIs('small', ` ${item.version}`) : null),
        el('small', { class: 'app-state' }, STATES[item.state].words),
        item.about ? el('small', { class: 'app-about' }, item.about) : null,
        item.needsUpdate ? el('small', { class: 'app-needs' }, item.needsUpdate === 'us' ? `${UPDATE.needs}: this app.` : `${UPDATE.needs}: ${item.name}.`) : null,
        item.update ? el('small', { class: 'app-update' }, `Update available: you have ${item.update.have}, the latest is ${item.update.latest}`) : null,
        item.line ? asIs('small', item.line, 'app-line') : null),
      el('span', { class: 'app-buttons' }, ...buttons));
  }

  function paint(view, status) {
    // Redrawing the list mustn't throw a keyboard user back to the start of the window.
    const had = view.list.contains(document.activeElement) ? document.activeElement.closest('.app-row')?.dataset.app : null;
    view.list.replaceChildren(...status.apps.map((item) => row(view, item, status)));
    if (had) view.list.querySelector(`.app-row[data-app="${CSS.escape(had)}"] button`)?.focus();
    if (view.toggle) view.toggle.checked = status.on;
    if (view.off) view.off.hidden = status.on;
    view.note.textContent = [
      status.on && !status.safe ? 'This computer has no safe place to keep links, so they last until the app closes.' : '',
      status.updates === 'unreachable' ? `${UPDATE.unreachable}.` : '',
    ].filter(Boolean).join(' ');
  }

  /** Ask the main process, and show the answer wherever the panel is open. A late answer never replaces a newer one. */
  async function look(how = 'quiet') {
    const mine = ++asked;
    const status = await api.appsStatus(how);
    if (mine < shown) return status;
    shown = mine;
    paintDot(status);
    for (const view of views) if (view.visible()) paint(view, status);
    return status;
  }

  async function turn(on) {
    const res = await api.linkSet(on);
    if (res?.error) toast(res.error);
    await look('quiet');
  }

  async function open() {
    if (!dlg.open) dlg.showModal();
    await look('panel');
  }

  $('btn-apps').onclick = open;
  $('apps-refresh').onclick = () => look('refresh');
  $('pref-link-refresh').onclick = () => look('refresh');
  $('apps-turn-on').onclick = () => turn(true);
  $('pref-link').addEventListener('change', () => turn($('pref-link').checked));
  $('apps-prefs').onclick = () => { dlg.close(); openPreferences?.('link'); };
  for (const id of ['apps-close', 'apps-done']) $(id).onclick = () => dlg.close();
  api.onAppsChanged(() => { look('quiet').catch(() => {}); });
  look('quiet').catch(() => {});                       // the dot, when the app starts: this asks no other computer anything

  return { open, look, showInPreferences: () => look('panel') };
}
