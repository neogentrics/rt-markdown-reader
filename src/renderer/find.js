// Find in the open document. Our own search of the rendered page (not the browser's page search, which also
// matched the text typed into the find box, ran on every keystroke and left scrolling to chance).
// It searches when you press Enter, then Enter / Shift+Enter move between matches and scroll each into view.

const SKIP = 'button, .copy-btn, .run-output, script, style, .mermaid-diagram, .katex-mathml';
const BLOCK = new Set(['P', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'TD', 'TH', 'TR', 'PRE', 'BLOCKQUOTE', 'DIV', 'SECTION',
  'ARTICLE', 'FIGCAPTION', 'DT', 'DD', 'UL', 'OL', 'TABLE', 'SUMMARY', 'DETAILS', 'HR', 'BR']);
const MAX_PAINTED = 1000;   // highlights drawn around the current match; the count still covers them all

const blockOf = (node) => {
  let el = node.parentElement;
  while (el && !BLOCK.has(el.tagName)) el = el.parentElement;
  return el;
};

/** The page's text in reading order, remembering which text node holds which characters. Blocks are kept apart. */
export function buildIndex(root) {
  const doc = root.ownerDocument;
  const walker = doc.createTreeWalker(root, 4 /* SHOW_TEXT */, {
    acceptNode: (n) => (n.parentElement?.closest(SKIP) ? 2 /* REJECT */ : 1 /* ACCEPT */),
  });
  const nodes = [];
  let text = '';
  let block = null;
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const b = blockOf(n);
    if (nodes.length && b !== block) text += '\n';
    block = b;
    nodes.push({ node: n, start: text.length, end: text.length + n.data.length });
    text += n.data;
  }
  return { text, nodes };
}

/** Every place `query` occurs in `text`: case-insensitive, and any run of spaces matches any run of whitespace. */
export function findOffsets(text, query, { matchCase = false } = {}) {
  if (!query) return [];
  const source = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ +/g, '\\s+');
  const re = new RegExp(source, matchCase ? 'gu' : 'giu');
  const out = [];
  for (let m = re.exec(text); m; m = re.exec(text)) out.push({ start: m.index, end: m.index + m[0].length });
  return out;
}

/** A DOM Range covering characters [start, end) of an index. */
export function rangeFor(index, start, end) {
  const { nodes } = index;
  const at = (offset, isEnd) => {
    let lo = 0, hi = nodes.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if ((isEnd ? nodes[mid].end < offset : nodes[mid].end <= offset)) lo = mid + 1; else hi = mid;
    }
    const n = nodes[lo];
    return { node: n.node, offset: Math.max(0, Math.min(n.node.data.length, offset - n.start)) };
  };
  const a = at(start, false), b = at(end, true);
  const range = a.node.ownerDocument.createRange();
  range.setStart(a.node, a.offset);
  range.setEnd(b.node, b.offset);
  return range;
}

export function createFind({ els, activeTab, deskFor, reveal }) {
  let state = null;   // { tab, query, index, matches, current }

  const paint = () => {
    if (!globalThis.CSS?.highlights || !globalThis.Highlight) return;
    CSS.highlights.delete('nmr-find');
    CSS.highlights.delete('nmr-find-current');
    if (!state?.matches.length) return;
    const from = Math.max(0, state.current - MAX_PAINTED / 2);
    const to = Math.min(state.matches.length, from + MAX_PAINTED);
    const all = new Highlight();
    for (let i = from; i < to; i++) if (i !== state.current) all.add(rangeFor(state.index, state.matches[i].start, state.matches[i].end));
    const now = new Highlight(rangeFor(state.index, state.matches[state.current].start, state.matches[state.current].end));
    now.priority = 1;
    CSS.highlights.set('nmr-find', all);
    CSS.highlights.set('nmr-find-current', now);
  };

  const clear = () => {
    state = null;
    els.findCount.textContent = '';
    if (globalThis.CSS?.highlights) { CSS.highlights.delete('nmr-find'); CSS.highlights.delete('nmr-find-current'); }
  };

  const rectOf = (i) => rangeFor(state.index, state.matches[i].start, state.matches[i].end).getBoundingClientRect();

  /** Move to match i: unfold anything hiding it, scroll it into view, mark it, and update the count. */
  const go = (i) => {
    const { tab, matches } = state;
    state.current = i;
    const range = rangeFor(state.index, matches[i].start, matches[i].end);
    const holder = range.startContainer.parentElement;
    reveal?.(holder, tab);
    const desk = deskFor(tab);
    const r = range.getBoundingClientRect();
    const d = desk.getBoundingClientRect();
    if (r.top < d.top + 48 || r.bottom > d.bottom - 48) {
      desk.scrollTo({ top: Math.max(0, desk.scrollTop + (r.top - d.top) - desk.clientHeight / 3), behavior: 'auto' });
    }
    paint();
    els.findCount.textContent = `${i + 1} of ${matches.length}`;
  };

  /** The first match at or below the top of what's on screen, so a search starts where you are reading. */
  const firstInView = () => {
    const { tab, matches } = state;
    const top = deskFor(tab).getBoundingClientRect().top;
    let lo = 0, hi = matches.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (rectOf(mid).bottom < top + 4) lo = mid + 1; else hi = mid;
    }
    return rectOf(lo).bottom < top + 4 ? 0 : lo;   // everything is above the screen: wrap to the first
  };

  const search = (query, forward = true) => {
    const tab = activeTab();
    if (!tab || !query) { clear(); return; }
    const index = buildIndex(tab.el);
    const matches = findOffsets(index.text, query);
    state = { tab, query, index, matches, current: 0 };
    if (!matches.length) {
      els.findCount.textContent = 'No results';
      paint();
      return;
    }
    go(forward ? firstInView() : Math.max(0, firstInView() - 1));
  };

  /** Enter / Shift+Enter / Next / Previous: search the first time, then step through the matches. */
  const step = (query, forward = true) => {
    const tab = activeTab();
    const fresh = !state || state.tab !== tab || state.query !== query || !state.matches.length
      || !state.index.nodes[0]?.node.isConnected;
    if (fresh) { search(query, forward); return; }
    const n = state.matches.length;
    go((state.current + (forward ? 1 : n - 1)) % n);
  };

  /** Show the bar with a ready-made search (e.g. arriving from a Find in Folder result), without taking focus. */
  const show = (query) => {
    els.findBar.hidden = false;
    els.findInput.value = query;
    search(query);
  };

  return { search, step, show, clear };
}
