'use strict';
// The installed list (3.14): how a Recon Towers app is found when it's on this computer but not running. Each app leaves
// `installed/<id>.json` in the App Link folder, and the others read it (docs/app-link.md, "The installed list").
//
// The file holds no secrets: the app's id, name, version and the path that starts it. Any program running as this person
// could write one, so nothing here starts a program unless the id is one of the suite's own and the path is a real program
// on this computer. It's started with no arguments, and no shell reads the path.
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { SUITE_IDS } = require('./suite-apps');
const { validId, cleanName } = require('./app-link');

const FOLDER = 'installed';
const MAX_PATH = 1024;
const MAX_FILE = 16 * 1024;
const isMacBundle = (file) => /\.app$/i.test(file);
const protocolOk = (n) => Number.isInteger(n) && n >= 1 && n <= 1000;

/** A full path on this computer: never one that reaches another computer, such as \\server\share. */
function localPath(file, platform = process.platform) {
  if (typeof file !== 'string' || !file || file.length > MAX_PATH || file.includes('\0')) return false;
  if (platform === 'win32') return /^[a-z]:[\\/]/i.test(file);
  return path.posix.isAbsolute(file) && !file.startsWith('//');
}

/**
 * What to start: on a Mac the .app that holds the running program, for an AppImage or a Windows portable copy the file the
 * person ran (not what it unpacked), and elsewhere the program itself.
 */
function launchPathFor({ execPath, env = process.env, platform = process.platform }) {
  if (platform === 'linux' && env.APPIMAGE) return env.APPIMAGE;
  if (platform === 'win32' && env.PORTABLE_EXECUTABLE_FILE) return env.PORTABLE_EXECUTABLE_FILE;
  if (platform === 'darwin') {
    const at = execPath.search(/\.app(\/|$)/i);
    return at >= 0 ? execPath.slice(0, at + 4) : execPath;
  }
  return execPath;
}

/** Write this app's file. Returns false if there's nothing sensible to write; a file that already says the same is left alone. */
function writeInstalled(shared, { id, name, version, launch, protocol = 1 }, platform = process.platform) {
  if (!validId(id) || !localPath(launch, platform)) return false;
  const dir = path.join(shared, FOLDER);
  const file = path.join(dir, `${id}.json`);
  const text = `${JSON.stringify({ id, name: cleanName(name, id), version: cleanName(String(version || '')), launch, protocol }, null, 2)}\n`;
  try { if (fs.readFileSync(file, 'utf8') === text) return true; } catch { /* not there yet */ }
  fs.mkdirSync(dir, { recursive: true });
  const temp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temp, text);
  fs.renameSync(temp, file);
  return true;
}

/**
 * Every app that says it's installed and whose program is still where it says. A file left behind by an uninstall is
 * ignored, not removed: it belongs to the other app, and its program may only be out of reach for now.
 */
function readInstalled(shared, { platform = process.platform, exists = fs.existsSync } = {}) {
  let names = [];
  try { names = fs.readdirSync(path.join(shared, FOLDER)); } catch { return []; }
  const found = [];
  for (const name of names.filter((n) => n.endsWith('.json')).slice(0, 100)) {
    let info;
    try {
      const file = path.join(shared, FOLDER, name);
      if (fs.statSync(file).size > MAX_FILE) continue;
      info = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch { continue; }
    // A newer protocol is still listed, so the panel can say it needs an update to link.
    if (!protocolOk(info?.protocol) || !validId(info.id) || `${info.id}.json` !== name) continue;
    if (!localPath(info.launch, platform) || !exists(info.launch)) continue;
    found.push({
      id: info.id,
      name: cleanName(info.name, info.id),
      version: cleanName(String(info.version || '')),
      launch: info.launch,
      protocol: info.protocol,
      minProtocol: protocolOk(info.minProtocol) ? info.minProtocol : 1,
      known: SUITE_IDS.includes(info.id),
    });
  }
  return found;
}

/** Is this a program that could be started? A Mac app is a folder; on Windows it's an .exe; elsewhere it must be executable. */
function startable(launch, platform = process.platform) {
  if (!localPath(launch, platform)) return false;
  try {
    const stat = fs.statSync(launch);
    if (platform === 'darwin' && isMacBundle(launch)) return stat.isDirectory();
    if (!stat.isFile()) return false;
    if (platform === 'win32') return /\.exe$/i.test(launch);
    fs.accessSync(launch, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/** Start an installed app, because the person just asked: one of the suite's own, and a real program. */
function launchInstalled(entry, { platform = process.platform, start = spawn } = {}) {
  if (!entry?.known) return Promise.reject(new Error('This app only starts the Recon Towers apps.'));
  if (!startable(entry.launch, platform)) return Promise.reject(new Error('That app isn’t where it was installed any more.'));
  const [command, args] = platform === 'darwin' && isMacBundle(entry.launch) ? ['open', ['-a', entry.launch]] : [entry.launch, []];
  return new Promise((resolve, reject) => {
    const failed = () => reject(new Error('That app wouldn’t start.'));
    let child;
    try { child = start(command, args, { detached: true, stdio: 'ignore', shell: false }); } catch { failed(); return; }
    child.once('error', failed);
    child.once('spawn', () => { child.unref(); resolve(); });
  });
}

/** Whether a Windows copy was put there by an installer, the only kind on Windows that updates itself: it has an uninstaller beside it. */
function fromInstaller(launch, list = fs.readdirSync) {
  if (!launch) return false;
  try { return list(path.dirname(launch)).some((name) => /^Uninstall .+\.exe$/i.test(name)); } catch { return false; }
}

module.exports = { localPath, launchPathFor, writeInstalled, readInstalled, startable, launchInstalled, fromInstaller };
