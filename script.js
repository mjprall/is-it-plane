// CDN base URL for Material Design Icons (pinned to a specific version for stability).
const CDN_BASE = 'https://cdn.jsdelivr.net/npm/@mdi/svg@7.4.47/svg';

// Image data: each entry has a CDN URL to fetch the SVG from, whether it's a plane,
// and an alt description.
const images = [
  { src: `${CDN_BASE}/airplane.svg`,         isPlane: true,  alt: 'A commercial passenger jet' },
  { src: `${CDN_BASE}/airplane-takeoff.svg`, isPlane: true,  alt: 'A plane taking off' },
  { src: `${CDN_BASE}/airplane-landing.svg`, isPlane: true,  alt: 'A jet coming in to land' },
  { src: `${CDN_BASE}/airplane-clock.svg`,   isPlane: true,  alt: 'A small propeller plane' },
  { src: `${CDN_BASE}/airplane-edit.svg`,    isPlane: true,  alt: 'A vintage biplane' },
  { src: `${CDN_BASE}/airplane-alert.svg`,   isPlane: true,  alt: 'A military fighter jet' },
  { src: `${CDN_BASE}/airplane-check.svg`,   isPlane: true,  alt: 'A private jet' },
  { src: `${CDN_BASE}/airplane-cog.svg`,     isPlane: true,  alt: 'A cargo plane' },
  { src: `${CDN_BASE}/car.svg`,              isPlane: false, alt: 'A car on the road' },
  { src: `${CDN_BASE}/ferry.svg`,            isPlane: false, alt: 'A ferry at sea' },
  { src: `${CDN_BASE}/bicycle.svg`,          isPlane: false, alt: 'A bicycle' },
  { src: `${CDN_BASE}/helicopter.svg`,       isPlane: false, alt: 'A helicopter in flight' },
  { src: `${CDN_BASE}/balloon.svg`,          isPlane: false, alt: 'A hot-air balloon' },
  { src: `${CDN_BASE}/train.svg`,            isPlane: false, alt: 'A train on the tracks' },
  { src: `${CDN_BASE}/rocket.svg`,           isPlane: false, alt: 'A space rocket' },
  { src: `${CDN_BASE}/rocket-launch.svg`,    isPlane: false, alt: 'A rocket launching' },
  { src: `${CDN_BASE}/ufo.svg`,              isPlane: false, alt: 'A UFO' },
  { src: `${CDN_BASE}/bus.svg`,              isPlane: false, alt: 'A bus' },
  { src: `${CDN_BASE}/truck.svg`,            isPlane: false, alt: 'A truck' },
  { src: `${CDN_BASE}/submarine.svg`,        isPlane: false, alt: 'A submarine' },
  { src: `${CDN_BASE}/motorbike.svg`,        isPlane: false, alt: 'A motorbike' },
  { src: `${CDN_BASE}/ambulance.svg`,        isPlane: false, alt: 'An ambulance' },
  { src: `${CDN_BASE}/fire-truck.svg`,       isPlane: false, alt: 'A fire truck' },
  { src: `${CDN_BASE}/tractor.svg`,          isPlane: false, alt: 'A tractor' },
  { src: `${CDN_BASE}/scooter.svg`,          isPlane: false, alt: 'A scooter' },
];

// State
let currentImage = null;
let correctCount = 0;
let wrongCount = 0;
let recentIndices = [];
let loadGeneration = 0; // incremented on each load to discard stale fetch results

// DOM refs
const svgContainer = document.getElementById('mystery-image');
const imageCard    = document.getElementById('image-card');
const feedbackEl  = document.getElementById('feedback');
const btnYes      = document.getElementById('btn-yes');
const btnNo       = document.getElementById('btn-no');
const nextHintEl  = document.getElementById('next-hint');
const correctEl   = document.getElementById('correct-count');
const wrongEl     = document.getElementById('wrong-count');

/**
 * Pick a random image, avoiding immediate repeats when possible.
 */
function pickRandom() {
  let attempts = 0;
  let idx;
  do {
    idx = Math.floor(Math.random() * images.length);
    attempts++;
  } while (recentIndices.includes(idx) && attempts < images.length);

  // Keep the last 3 indices to avoid immediate repetition
  recentIndices.push(idx);
  if (recentIndices.length > 3) {
    recentIndices.shift();
  }
  return images[idx];
}

/**
 * Fetch an SVG from a URL and return its text content.
 * @param {string} url - CDN URL of the SVG to load
 * @returns {Promise<string>} The raw SVG markup
 */
async function fetchSVG(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch SVG from ${url}: ${response.status} ${response.statusText}`);
  }
  return response.text();
}

/**
 * Load a new random image into the card with a slide-in animation.
 * Fetches SVG content from the CDN and injects it inline.
 */
async function loadNewImage() {
  currentImage = pickRandom();
  const generation = ++loadGeneration;

  // Trigger animation
  imageCard.classList.remove('animate');
  // Force a reflow so the browser registers the class removal before re-adding
  // it — this restarts the CSS keyframe animation from the beginning.
  void imageCard.offsetWidth; // reflow
  imageCard.classList.add('animate');

  // Re-enable buttons and clear feedback
  feedbackEl.textContent = '';
  feedbackEl.className = 'feedback';
  nextHintEl.textContent = '';
  btnYes.disabled = false;
  btnNo.disabled  = false;

  svgContainer.innerHTML = '<span class="image-loading">Loading…</span>';

  try {
    const svgText = await fetchSVG(currentImage.src);
    // Discard results from a superseded load (e.g. rapid successive calls)
    if (generation !== loadGeneration) return;
    svgContainer.innerHTML = svgText;
    const svgEl = svgContainer.querySelector('svg');
    if (svgEl) {
      svgEl.setAttribute('aria-label', currentImage.alt);
      svgEl.setAttribute('role', 'img');
    }
  } catch (err) {
    if (generation !== loadGeneration) return;
    svgContainer.innerHTML = '<span class="image-error">⚠️ Failed to load image</span>';
    console.error('Failed to fetch image:', err);
  }
}

/**
 * Handle a Yes or No button click.
 * @param {boolean} userSaysPlane - true if the user clicked "Yes"
 */
function handleAnswer(userSaysPlane) {
  if (!currentImage) return;

  // Disable buttons immediately to prevent double-clicks
  btnYes.disabled = true;
  btnNo.disabled  = true;

  const correct = userSaysPlane === currentImage.isPlane;

  if (correct) {
    correctCount++;
    correctEl.textContent = correctCount;
    feedbackEl.textContent = currentImage.isPlane
      ? '✈️ Correct! That\'s definitely a plane!'
      : '✅ Correct! Not a plane at all!';
    feedbackEl.className = 'feedback correct';
  } else {
    wrongCount++;
    wrongEl.textContent = wrongCount;
    feedbackEl.textContent = currentImage.isPlane
      ? '❌ Nope — that was actually a plane!'
      : '❌ Wrong! That\'s not a plane!';
    feedbackEl.className = 'feedback wrong';
  }

  // After a brief pause, load the next image
  nextHintEl.textContent = 'Loading next image…';
  setTimeout(loadNewImage, 1800);
}

// Wire up buttons via event listeners (no inline onclick in HTML)
btnYes.addEventListener('click', () => handleAnswer(true));
btnNo.addEventListener('click',  () => handleAnswer(false));

// Start the game when the page loads
loadNewImage();
