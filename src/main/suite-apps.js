'use strict';
// The Recon Towers apps and the words used about them, in one small file with no dependencies, so every app can copy it.
// The list and the rules are in docs/app-suite.md ("Apps status in every app"), and match RT Story Tracker's copy.
//
// A new app is one more line in SUITE_APPS. The wording stays the same in every app: don't invent other labels.
// The page and the main process both use this file, so keep it free of Node APIs.

const STORE = 'https://recontowers.com/projects/';

// id, name, one short line, and the page "Get it" opens. Only pages that are known are exact: the others open the store's
// list of projects until each app has a page of its own, and each is changed here when it has.
const SUITE_APPS = [
  { id: 'rt-markdown-reader', name: 'RT Markdown Reader', about: 'Read, edit, listen to and publish documents', page: STORE },
  { id: 'rt-story-tracker', name: 'RT Story Tracker', about: 'Write the book, and keep the story bible', page: `${STORE}storytracker/` },
  { id: 'rt-author-desk', name: 'RT Author Desk', about: 'Catalog, accounts, launches and royalties', page: STORE },
  { id: 'rt-press', name: 'RT Press', about: 'Designed print interiors and cover wraps', page: STORE },
  { id: 'rt-audio-studio', name: 'RT Audio Studio', about: 'Audiobooks and podcasts', page: STORE },
  { id: 'recon-browser', name: 'Recon Browser', about: 'A browser for research, which sends clips to your story', page: STORE },
];

const SUITE_IDS = SUITE_APPS.map((app) => app.id);
const appById = (id) => SUITE_APPS.find((app) => app.id === id) || null;

// Where an app is, as the person sees it. A linked app is Linked whether or not it's open right now. Otherwise one that's
// open is Found, one that's only installed is Installed, and one that's neither is Not installed.
const STATES = {
  linked: { words: 'Linked', button: 'Open' },
  found: { words: 'Found, not linked', button: 'Link' },
  installed: { words: 'Installed, not running', button: 'Open' },
  missing: { words: 'Not installed', button: 'Get it' },
};

const stateOf = ({ linked = false, running = false, installed = false }) => (linked ? 'linked' : running ? 'found' : installed ? 'installed' : 'missing');

const TITLE = 'Recon Towers apps';

// The dot on the toolbar only summarises. The words are what someone who can't tell the colours apart reads.
const DOTS = {
  off: 'App Link is off',
  green: 'An app is linked',
  amber: 'Apps found, none linked',
  grey: 'No other app found',
};

/** `apps` are the rows the panel shows. Something counts as found if it's installed or running. */
function dotOf({ on, apps = [] }) {
  if (!on) return 'off';
  if (apps.some((app) => app.linked)) return 'green';
  return apps.some((app) => app.installed || app.running) ? 'amber' : 'grey';
}

// Updates and compatibility. A newer version is only a nudge, and never stops a link that would otherwise work.
const UPDATE = {
  available: 'Update available',
  needs: 'Needs an update to link',
  unreachable: 'Couldn’t check for updates',
  open: 'Open to update',
  download: 'Download',
};

const VERSION = /^(\d{1,4})\.(\d{1,4})\.(\d{1,4})$/;
const validVersion = (text) => typeof text === 'string' && VERSION.test(text);

/** Is `latest` newer than `have`? Anything that isn't a plain version number is never newer, so an odd string raises no nudge. */
function isNewer(latest, have) {
  if (!validVersion(latest) || !validVersion(have)) return false;
  const [a, b] = [latest, have].map((text) => VERSION.exec(text).slice(1).map(Number));
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i];
  return false;
}

/** Which button goes with an update: an app that updates itself is opened (nothing, if it's already open); the rest are downloaded. */
function updateButton({ platform, launch = '', running = false, installer = false }) {
  const selfUpdates = (platform === 'win32' && installer) || (platform === 'linux' && /\.AppImage$/i.test(launch));
  if (!selfUpdates) return 'download';
  return running ? '' : 'open';
}

/**
 * Can two apps link? Each side is { protocol, minProtocol, accepts }, as `hello` and the installed file say them. Only the
 * App Link version and the formats of document decide, never an app's own version number. `who` is the one that needs the
 * update: 'them' when the other app is too old for this one, 'us' when this one is too old for it.
 */
function linkability({ mine, theirs }) {
  const minimum = (side) => (Number.isInteger(side.minProtocol) && side.minProtocol >= 1 ? side.minProtocol : 1);
  if (!Number.isInteger(theirs.protocol) || theirs.protocol < minimum(mine)) return { ok: false, who: 'them' };
  if (mine.protocol < minimum(theirs)) return { ok: false, who: 'us' };
  const [ours, others] = [mine.accepts, theirs.accepts].map((list) => (Array.isArray(list) ? list : []));
  if (ours.length && others.length && !ours.some((kind) => others.includes(kind))) return { ok: false, who: 'them' };
  return { ok: true };
}

module.exports = { STORE, SUITE_APPS, SUITE_IDS, STATES, TITLE, DOTS, UPDATE, appById, stateOf, dotOf, validVersion, isNewer, updateButton, linkability };
