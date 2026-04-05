// Image data: each entry has a path, whether it's a plane, and an alt description.
const images = [
  { src: 'images/commercial-jet.svg',  isPlane: true,  alt: 'A commercial passenger jet' },
  { src: 'images/fighter-jet.svg',     isPlane: true,  alt: 'A military fighter jet' },
  { src: 'images/biplane.svg',         isPlane: true,  alt: 'A classic biplane' },
  { src: 'images/space-shuttle.svg',   isPlane: true,  alt: 'A space shuttle orbiter' },
  { src: 'images/car.svg',             isPlane: false, alt: 'A red car on the road' },
  { src: 'images/cargo-ship.svg',      isPlane: false, alt: 'A cargo ship at sea' },
  { src: 'images/bicycle.svg',         isPlane: false, alt: 'A bicycle in the park' },
  { src: 'images/helicopter.svg',      isPlane: false, alt: 'A helicopter in flight' },
  { src: 'images/hot-air-balloon.svg', isPlane: false, alt: 'A hot-air balloon' },
  { src: 'images/train.svg',           isPlane: false, alt: 'A steam train on the tracks' },
];

// State
let currentImage = null;
let correctCount = 0;
let wrongCount = 0;
let recentIndices = [];

// DOM refs
const imgEl       = document.getElementById('mystery-image');
const imageCard   = document.getElementById('image-card');
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
 * Load a new random image into the card with a slide-in animation.
 */
function loadNewImage() {
  currentImage = pickRandom();
  imgEl.src = currentImage.src;
  imgEl.alt = currentImage.alt;

  // Trigger animation
  imageCard.classList.remove('animate');
  void imageCard.offsetWidth; // reflow
  imageCard.classList.add('animate');

  // Re-enable buttons and clear feedback
  feedbackEl.textContent = '';
  feedbackEl.className = 'feedback';
  nextHintEl.textContent = '';
  btnYes.disabled = false;
  btnNo.disabled  = false;
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

// Start the game when the page loads
loadNewImage();
