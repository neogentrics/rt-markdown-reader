'use strict';
// The rows of the Apps panel (3.14): every app in the suite, with whether it's on this computer, running and linked, and which
// buttons go with it. Pure: main.js gathers what's installed, running and linked, and this only puts it together.
const { SUITE_APPS, stateOf, isNewer, updateButton, linkability } = require('./suite-apps');

/**
 * @param {object} o
 * @param {string} o.self                     this app's id: it isn't listed
 * @param {{ protocol, minProtocol, accepts }} o.mine
 * @param {object[]} o.installed              from readInstalled()
 * @param {object[]} o.running                from AppLink.found(): { id, name, version, protocol, minProtocol, accepts }
 * @param {object} o.links                    the saved links: { id: { name } }  (their keys never leave the main process)
 * @param {object} o.latest                   from the versions file: { id: { version } }
 */
function appRows({ self, mine, installed = [], running = [], links = {}, latest = {}, platform = process.platform, fromInstaller = () => false }) {
  const rows = new Map();
  const row = (id, name) => {
    if (!rows.has(id)) rows.set(id, { id, name, about: '', version: '', installed: false, running: false, linked: false, known: false });
    return rows.get(id);
  };
  for (const app of SUITE_APPS) if (app.id !== self) Object.assign(row(app.id, app.name), { about: app.about, known: true });
  const launches = new Map();
  for (const item of installed) {
    if (item.id === self) continue;
    launches.set(item.id, item.launch);
    Object.assign(row(item.id, item.name), { installed: true, version: item.version, protocol: item.protocol, minProtocol: item.minProtocol });
  }
  for (const item of running) {
    if (item.id === self) continue;
    const it = row(item.id, item.name);
    // What a running app says about itself is newer than the file it left.
    Object.assign(it, { running: true, version: item.version || it.version, protocol: item.protocol, minProtocol: item.minProtocol, accepts: item.accepts });
  }
  for (const [id, link] of Object.entries(links)) {
    if (id === self) continue;
    const it = row(id, link.name);
    it.linked = true;
    if (!it.known) it.name = link.name || it.name;           // an app outside the suite's list goes by the name it was linked under
  }

  const list = [...rows.values()].map((item) => {
    const state = stateOf(item);
    const fit = item.protocol ? linkability({ mine, theirs: item }) : { ok: true };
    const newest = latest[item.id]?.version;
    const update = item.version && newest && isNewer(newest, item.version)
      ? { have: item.version, latest: newest, action: updateButton({ platform, launch: launches.get(item.id), running: item.running, installer: platform === 'win32' && fromInstaller(launches.get(item.id)) }) }
      : null;
    return {
      id: item.id, name: item.name, about: item.about, version: item.version, state,
      installed: item.installed, running: item.running, linked: item.linked, known: item.known,
      canOpen: item.installed && item.known && !item.running,          // only the suite's own apps are ever started
      canLink: state === 'found' && fit.ok,
      canGet: item.known && !item.installed && !item.running && !item.linked,
      needsUpdate: fit.ok ? '' : fit.who,
      update,                                                          // a nudge, and only a nudge: it takes no button away
      line: '',
    };
  });
  const place = (item) => (item.known ? SUITE_APPS.findIndex((a) => a.id === item.id) : SUITE_APPS.length);
  return list.sort((a, b) => place(a) - place(b) || a.name.localeCompare(b.name));
}

module.exports = { appRows };
