// Tutorial navigation and interactive demo logic

let currentPage = 1;
const totalPages = 5;

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
  initializeTutorial();
});

function initializeTutorial() {
  // Set up navigation buttons
  const btnBack = document.getElementById('btn-back');
  const btnNext = document.getElementById('btn-next');
  const btnSkip = document.getElementById('btn-skip');
  const btnFinish = document.getElementById('btn-finish-tutorial');

  if (btnBack) {
    btnBack.addEventListener('click', goToPreviousPage);
  }

  if (btnNext) {
    btnNext.addEventListener('click', goToNextPage);
  }

  if (btnSkip) {
    btnSkip.addEventListener('click', skipTutorial);
  }

  if (btnFinish) {
    btnFinish.addEventListener('click', finishTutorial);
  }

  // Set up keyboard demo on page 2
  setupKeyboardDemo();

  // Update initial state
  updateNavigation();
  updateProgress();
}

function goToNextPage() {
  if (currentPage < totalPages) {
    showPage(currentPage + 1);
  }
}

function goToPreviousPage() {
  if (currentPage > 1) {
    showPage(currentPage - 1);
  }
}

function showPage(pageNumber) {
  // Hide current page
  const currentPageEl = document.getElementById(`tutorial-page-${currentPage}`);
  if (currentPageEl) {
    currentPageEl.classList.remove('active');
  }

  // Show new page
  currentPage = pageNumber;
  const newPageEl = document.getElementById(`tutorial-page-${currentPage}`);
  if (newPageEl) {
    newPageEl.classList.add('active');
  }

  // Update navigation
  updateNavigation();
  updateProgress();

  // Scroll to top
  window.scrollTo(0, 0);
}

function updateNavigation() {
  const btnBack = document.getElementById('btn-back');
  const btnNext = document.getElementById('btn-next');

  if (btnBack) {
    btnBack.disabled = currentPage === 1;
  }

  if (btnNext) {
    if (currentPage === totalPages) {
      btnNext.style.display = 'none';
    } else {
      btnNext.style.display = 'inline-block';
    }
  }
}

function updateProgress() {
  const progressText = document.getElementById('progress-text');
  if (progressText) {
    progressText.textContent = `Page ${currentPage} of ${totalPages}`;
  }
}

function skipTutorial() {
  // Show confirmation dialog
  if (confirm('Are you sure you want to skip the tutorial?\n\nYou can always access it later from Settings → Show Tutorial Again.')) {
    // Send IPC message to mark tutorial complete and close window
    if (window.electronAPI) {
      window.electronAPI.skipTutorial();
    }
  }
}

function finishTutorial() {
  // Mark tutorial as complete and close window
  if (window.electronAPI) {
    window.electronAPI.finishTutorial();
  }
}

// Keyboard demo for page 2
function setupKeyboardDemo() {
  let demoHandlerAttached = false;

  // Attach keyboard handler when page 2 becomes visible
  const observer = new MutationObserver(() => {
    const page2 = document.getElementById('tutorial-page-2');
    if (page2 && page2.classList.contains('active') && !demoHandlerAttached) {
      attachKeyboardHandler();
      demoHandlerAttached = true;
    }
  });

  // Observe changes to tutorial pages
  const pages = document.querySelectorAll('.tutorial-page');
  pages.forEach(page => {
    observer.observe(page, { attributes: true, attributeFilter: ['class'] });
  });

  // Also attach immediately if page 2 is active
  const page2 = document.getElementById('tutorial-page-2');
  if (page2 && page2.classList.contains('active')) {
    attachKeyboardHandler();
    demoHandlerAttached = true;
  }
}

function attachKeyboardHandler() {
  const demoFeedback = document.getElementById('demo-feedback');

  document.addEventListener('keydown', (event) => {
    const page2 = document.getElementById('tutorial-page-2');
    if (!page2 || !page2.classList.contains('active')) {
      return; // Only active on page 2
    }

    if (event.key === 'j' || event.key === 'J') {
      showDemoFeedback('✅ Great! J key detected', 'success');
    } else if (event.key === 'k' || event.key === 'K') {
      showDemoFeedback('✅ Excellent! K key detected', 'success');
    }
  });
}

function showDemoFeedback(message, type) {
  const demoFeedback = document.getElementById('demo-feedback');
  if (!demoFeedback) return;

  demoFeedback.textContent = message;
  demoFeedback.className = `demo-feedback ${type}`;
  demoFeedback.style.display = 'block';

  // Clear after 2 seconds
  setTimeout(() => {
    demoFeedback.style.display = 'none';
  }, 2000);
}
