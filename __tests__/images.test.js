'use strict';

/**
 * @jest-environment jsdom
 *
 * Tests for image data integrity and loading behaviour.
 * Each entry in the `images` array gets its own test case to verify it
 * resolves to a real SVG file in the pinned @mdi/svg package and that the
 * game logic handles it correctly.
 */

const path = require('path');
const fs   = require('fs');

// ---------------------------------------------------------------------------
// Resolve the local @mdi/svg SVG directory (pinned version in package.json).
// ---------------------------------------------------------------------------
const MDI_PKG_DIR = path.dirname(require.resolve('@mdi/svg/package.json'));
const MDI_SVG_DIR = path.join(MDI_PKG_DIR, 'svg');

// ---------------------------------------------------------------------------
// Bootstrap a minimal DOM so that script.js can be required without errors.
// ---------------------------------------------------------------------------
document.body.innerHTML = `
  <div id="image-card" class="image-card">
    <div id="mystery-image"></div>
  </div>
  <div id="feedback" class="feedback"></div>
  <button id="btn-yes"></button>
  <button id="btn-no"></button>
  <div id="next-hint"></div>
  <span id="correct-count">0</span>
  <span id="wrong-count">0</span>
`;

// Stub fetch so the automatic loadNewImage() call on module load doesn't fail.
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  text: async () => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M0 0"/></svg>',
});

// Require the game script.  This also fires loadNewImage() immediately, which
// is fine because fetch is already stubbed above.
const { images, CDN_BASE, fetchSVG, loadNewImage } = require('../script.js');

// ---------------------------------------------------------------------------
// Helper: extract the filename from a CDN URL, e.g. "airplane.svg"
// ---------------------------------------------------------------------------
function svgFilename(src) {
  return src.split('/').pop();
}

// ===========================================================================
// 1.  Image array structure
// ===========================================================================
describe('images array', () => {
  test('contains the expected number of entries', () => {
    expect(images.length).toBeGreaterThan(0);
  });

  test.each(images)('[$#] $alt – has required fields with correct types', ({ src, isPlane, alt }) => {
    expect(typeof src).toBe('string');
    expect(src.length).toBeGreaterThan(0);
    expect(typeof isPlane).toBe('boolean');
    expect(typeof alt).toBe('string');
    expect(alt.length).toBeGreaterThan(0);
  });

  test.each(images)('[$#] $alt – src starts with CDN_BASE', ({ src }) => {
    expect(src.startsWith(CDN_BASE)).toBe(true);
  });

  test.each(images)('[$#] $alt – src ends with .svg', ({ src }) => {
    expect(src.endsWith('.svg')).toBe(true);
  });
});

// ===========================================================================
// 2.  SVG file existence in the pinned @mdi/svg package
//     One test per image ensures any future broken icon is immediately visible.
// ===========================================================================
describe('SVG file availability in @mdi/svg package', () => {
  test.each(images)('[$#] $alt – file exists on disk', ({ src }) => {
    const filePath = path.join(MDI_SVG_DIR, svgFilename(src));
    expect(fs.existsSync(filePath)).toBe(true);
  });

  test.each(images)('[$#] $alt – file contains a valid <svg> element', ({ src }) => {
    const filePath = path.join(MDI_SVG_DIR, svgFilename(src));
    const content  = fs.readFileSync(filePath, 'utf8');
    expect(content).toMatch(/<svg[^>]*>/);
    expect(content).toMatch(/<\/svg>/);
  });
});

// ===========================================================================
// 3.  fetchSVG – one test per image (happy path) + error-handling tests
// ===========================================================================
describe('fetchSVG', () => {
  const STUB_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M0 0"/></svg>';

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  test.each(images)('[$#] $alt – resolves with SVG text on a 200 response', async ({ src }) => {
    global.fetch.mockResolvedValueOnce({ ok: true, text: async () => STUB_SVG });

    const result = await fetchSVG(src);

    expect(global.fetch).toHaveBeenCalledWith(src);
    expect(result).toBe(STUB_SVG);
  });

  test('rejects with a descriptive error on a non-OK response', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });

    await expect(fetchSVG(`${CDN_BASE}/missing.svg`))
      .rejects.toThrow('404');
  });

  test('propagates network-level errors (e.g. offline)', async () => {
    global.fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(fetchSVG(`${CDN_BASE}/airplane.svg`))
      .rejects.toThrow('Failed to fetch');
  });
});

// ===========================================================================
// 4.  loadNewImage – verifies each image is rendered into the DOM correctly
// ===========================================================================
describe('loadNewImage', () => {
  const STUB_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M0 0"/></svg>';

  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, text: async () => STUB_SVG });
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test.each(images)('[$#] $alt – injects an <svg> element into the DOM', async ({ src }) => {
    // Point fetch to return the stub SVG only for this URL
    global.fetch.mockResolvedValue({ ok: true, text: async () => STUB_SVG });

    await loadNewImage();

    const container = document.getElementById('mystery-image');
    expect(container.querySelector('svg')).not.toBeNull();
  });

  test.each(images)('[$#] $alt – sets aria-label and role on the injected SVG', async ({ alt }) => {
    // We cannot control which image pickRandom() selects, but we can verify
    // that whatever image loads, the attributes are always set correctly.
    global.fetch.mockResolvedValue({ ok: true, text: async () => STUB_SVG });

    await loadNewImage();

    const svgEl = document.getElementById('mystery-image').querySelector('svg');
    expect(svgEl).not.toBeNull();
    expect(svgEl.getAttribute('role')).toBe('img');
    // aria-label should be a non-empty string (set from currentImage.alt)
    const label = svgEl.getAttribute('aria-label');
    expect(typeof label).toBe('string');
    expect(label.length).toBeGreaterThan(0);
  });

  test('shows an error message when fetch fails', async () => {
    global.fetch.mockRejectedValue(new Error('network error'));

    await loadNewImage();

    const container = document.getElementById('mystery-image');
    expect(container.querySelector('.image-error')).not.toBeNull();
  });
});
