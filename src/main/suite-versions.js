'use strict';
// "What's the latest version of each Recon Towers app?" (3.14), from one small file on the Recon Towers site, not GitHub:
// some apps are in private repositories, and GitHub limits anonymous checks (docs/app-suite.md, "Updates and compatibility").
//
//   { "apps": { "rt-press": { "version": "1.0.0", "released": "2026-12-01", "url": "https://recontowers.com/apps/rt-press/" } } }
//
// The rules, which the tests check with a stand-in:
//  - It's read only when the Apps panel opens or Refresh is pressed. Never on a timer, and never by itself at start.
//  - An answer is kept for a day, a failure for an hour, so a computer that's offline isn't asked at every click.
//  - It's a plain GET of the address, with nothing added: no query, no ids, no list of what's installed, no cookies.
//  - A file that isn't published yet is "unavailable", and nothing is said. If the site can't be reached the panel says
//    so and carries on. Neither stops anything.
//  - What comes back is untrusted: its size is limited, and only version numbers and https pages on our own site are kept.
const fs = require('node:fs');
const path = require('node:path');
const { validVersion } = require('./suite-apps');
const { validId } = require('./app-link');

const VERSIONS_URL = 'https://recontowers.com/apps/versions.json';
const SITE = 'recontowers.com';
const DAY_MS = 24 * 60 * 60 * 1000;
const FAILED_MS = 60 * 60 * 1000;
const TIMEOUT_MS = 8000;
const MAX_BYTES = 64 * 1024;
const MAX_APPS = 64;

/** An https page on the Recon Towers site, or ''. */
function sitePage(text) {
  try {
    const url = new URL(text);
    return url.protocol === 'https:' && (url.hostname === SITE || url.hostname.endsWith(`.${SITE}`)) && !url.username && !url.password ? url.href : '';
  } catch { return ''; }
}

/** Only what's wanted is kept, whatever else the file says. */
function readVersions(data) {
  const apps = {};
  const list = data && typeof data === 'object' && data.apps && typeof data.apps === 'object' ? Object.entries(data.apps) : [];
  for (const [id, entry] of list.slice(0, MAX_APPS)) {
    if (!validId(id) || !entry || typeof entry !== 'object' || !validVersion(entry.version)) continue;
    const url = sitePage(entry.url);
    apps[id] = { version: entry.version, ...(url ? { url } : {}) };
  }
  return apps;
}

class Versions {
  /**
   * @param {object} o
   * @param {Function} o.fetch   a fetch()
   * @param {string} [o.file]    keeps the answer between runs: only what the site said, the same for everybody
   */
  constructor({ fetch: fetchIt, url = VERSIONS_URL, now = () => Date.now(), file = null }) {
    Object.assign(this, { fetchIt, url, now, file });
    this.answer = null;
    this.waiting = null;
  }

  load() {
    if (!this.file) return null;
    try {
      const saved = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      if (typeof saved.at !== 'number' || !['ok', 'unavailable', 'unreachable'].includes(saved.state)) return null;
      return { at: saved.at, state: saved.state, apps: saved.state === 'ok' ? readVersions({ apps: saved.apps }) : {} };
    } catch { return null; }
  }

  save(answer) {
    if (!this.file) return;
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      fs.writeFileSync(this.file, JSON.stringify(answer));
    } catch { /* forgetting only means asking again */ }
  }

  fresh(answer) {
    const keep = answer?.state === 'unreachable' ? FAILED_MS : DAY_MS;
    return !!answer && this.now() >= answer.at && this.now() - answer.at < keep;
  }

  async ask() {
    try {
      const res = await this.fetchIt(this.url, { method: 'GET', credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store', signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (res.status === 404 || res.status === 410) return { state: 'unavailable', apps: {} };
      if (!res.ok) return { state: 'unreachable', apps: {} };
      const text = await res.text();
      if (text.length > MAX_BYTES) return { state: 'unavailable', apps: {} };
      try { return { state: 'ok', apps: readVersions(JSON.parse(text)) }; } catch { return { state: 'unavailable', apps: {} }; }
    } catch {
      return { state: 'unreachable', apps: {} };
    }
  }

  /** { state: 'ok' | 'unavailable' | 'unreachable', apps }. `force` is Refresh: the person asking again. */
  async check({ force = false } = {}) {
    this.answer ??= this.load();
    if (!force && this.fresh(this.answer)) return this.answer;
    this.waiting ??= this.ask().then((result) => {
      this.answer = { at: this.now(), ...result };
      this.save(this.answer);
      return this.answer;
    }).finally(() => { this.waiting = null; });
    return this.waiting;
  }
}

module.exports = { Versions, VERSIONS_URL, DAY_MS, FAILED_MS, readVersions, sitePage };
