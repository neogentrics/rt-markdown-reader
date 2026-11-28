// Takes the shared theme (neogentrics/recon-theme) into this app at a tag. The same method as scripts/core-sync.mjs,
// which does the work: see it for how it stays safe.
//
//   node scripts/theme-sync.mjs v0.1.0            copy the theme files and write theme.lock
//   node scripts/theme-sync.mjs v0.1.0 --check    compare the copies here with that tag; writes nothing
//   --source <url or folder>                      where to clone from (default: the GitHub repository)
//
// The copies and theme.lock are committed, so building and testing the app need no access to recon-theme.
// test/theme.test.mjs recomputes the hashes offline and fails if a copy was edited, removed or added to.
//
// Never edit a file under src/renderer/shared/. Change it in recon-theme, tag it there, and run this with the new tag.
import { pathToFileURL } from 'node:url';
import { run, sync as syncShared, verify as verifyShared } from './core-sync.mjs';

export const THEME = {
  repository: 'neogentrics/recon-theme',
  pieces: ['theme'],
  into: 'src/renderer/shared',    // the page's bundle takes these in; the stylesheets load them from here
  lock: 'theme.lock',
  script: 'scripts/theme-sync.mjs',
};

export const verify = (root) => verifyShared(root, THEME);
export const sync = (options) => syncShared({ ...options, module: THEME });

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) run(THEME);
