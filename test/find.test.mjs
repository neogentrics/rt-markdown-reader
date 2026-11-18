import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { buildIndex, findOffsets, rangeFor } from '../src/renderer/find.js';

const page = (html) => new JSDOM(`<article id="p">${html}</article>`).window.document.getElementById('p');
const texts = (root, query) => {
  const index = buildIndex(root);
  return findOffsets(index.text, query).map((m) => rangeFor(index, m.start, m.end).toString());
};

test('finds every occurrence, ignoring case', () => {
  assert.deepEqual(texts(page('<p>The needle and a Needle.</p><p>NEEDLE</p>'), 'needle'), ['needle', 'Needle', 'NEEDLE']);
});

test('finds nothing when the word is not in the document', () => {
  assert.deepEqual(texts(page('<p>weather and sea</p>'), 'zzqx'), []);
});

test('a word split by formatting is still found, and the range covers it all', () => {
  assert.deepEqual(texts(page('<p>a <strong>need</strong>le here</p>'), 'needle'), ['needle']);
});

test('a match never runs from one paragraph into the next', () => {
  assert.deepEqual(texts(page('<p>the sea</p><p>Paragraph two</p>'), 'seaParagraph'), []);
});

test('a space in the search matches a line break in the text', () => {
  assert.deepEqual(texts(page('<p>weather and\nthe sea</p>'), 'and the'), ['and\nthe']);
});

test('search characters that mean something to a pattern are taken literally', () => {
  assert.deepEqual(texts(page('<p>cost (approx.) is $5 [net] a+b</p>'), '(approx.)'), ['(approx.)']);
  assert.deepEqual(texts(page('<p>cost is $5 [net] a+b</p>'), '$5 [net] a+b'), ['$5 [net] a+b']);
});

test('buttons, code output and scripts are not searched', () => {
  assert.deepEqual(texts(page('<p>keep</p><button>keep</button><div class="run-output">keep</div>'), 'keep'), ['keep']);
});

test('an empty search finds nothing', () => {
  assert.deepEqual(findOffsets('anything', ''), []);
});
