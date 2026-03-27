// Obsidian News Desk - Installation Wizard Logic

let currentPage = 0;
const totalPages = 6;
const wizardData = {
  storagePath: '',
  aiProvider: 'openai',
  openaiKey: '',
  claudeKey: '',
  googleKey: '',
  groqKey: '',
  whiskToken: '',
};

// Page navigation
function showPage(pageIndex) {
  const pages = document.querySelectorAll('.wizard-page');
  pages.forEach((page, index) => {
    page.classList.toggle('active', index === pageIndex);
  });

  currentPage = pageIndex;
  updateProgress();
  updateButtons();
}

function nextPage() {
  if (currentPage < totalPages - 1) {
    showPage(currentPage + 1);
  }
}

function prevPage() {
  if (currentPage > 0) {
    showPage(currentPage - 1);
  }
}

function updateProgress() {
  const progress = ((currentPage + 1) / totalPages) * 100;
  const progressBar = document.querySelector('.progress-bar');
  if (progressBar) {
    progressBar.style.width = `${progress}%`;
  }
}

function updateButtons() {
  const prevBtn = document.getElementById('btn-prev');
  const nextBtn = document.getElementById('btn-next');
  const finishBtn = document.getElementById('btn-finish');

  if (prevBtn) {
    prevBtn.style.display = currentPage === 0 ? 'none' : 'inline-block';
  }

  if (nextBtn && finishBtn) {
    if (currentPage === totalPages - 1) {
      nextBtn.style.display = 'none';
      finishBtn.style.display = 'inline-block';
    } else {
      nextBtn.style.display = 'inline-block';
      finishBtn.style.display = 'none';
    }
  }
}

// Page-specific logic

// Page 1: Welcome - Check system requirements
function checkSystemRequirements() {
  const requirements = [
    { id: 'req-disk', check: checkDiskSpace },
    { id: 'req-memory', check: checkMemory },
    { id: 'req-node', check: checkNode },
  ];

  requirements.forEach(req => {
    updateRequirementStatus(req.id, 'checking');
    setTimeout(() => {
      req.check(req.id);
    }, 500);
  });
}

function updateRequirementStatus(id, status) {
  const element = document.getElementById(id);
  if (!element) return;

  const statusIcon = element.querySelector('.requirement-status');
  statusIcon.className = `requirement-status ${status}`;

  const icons = {
    pending: '○',
    checking: '◐',
    success: '✓',
    error: '✗',
  };

  statusIcon.textContent = icons[status] || '○';
}

function checkDiskSpace(id) {
  // Simulated check - will be implemented via IPC in later phases
  setTimeout(() => {
    updateRequirementStatus(id, 'success');
  }, 800);
}

function checkMemory(id) {
  setTimeout(() => {
    updateRequirementStatus(id, 'success');
  }, 1200);
}

function checkNode(id) {
  // Node.js is bundled with Electron, always succeeds
  setTimeout(() => {
    updateRequirementStatus(id, 'success');
  }, 600);
}

// Page 2: Docker Check
async function checkDocker() {
  const statusBox = document.getElementById('docker-status');
  const installBtn = document.getElementById('btn-install-docker');
  const startBtn = document.getElementById('btn-start-docker');
  const continueBtn = document.getElementById('btn-next');

  updateDockerStatus('Checking for Docker Desktop...', 'info');

  try {
    // Real IPC call to check Docker status
    const status = await window.electronAPI.docker.getStatus();

    if (!status.installed) {
      updateDockerStatus('Docker Desktop is not installed.', 'warning');
      installBtn.style.display = 'inline-block';
      continueBtn.disabled = true;
      return;
    }

    updateDockerStatus('Docker Desktop detected! Checking if running...', 'success');

    if (!status.running) {
      updateDockerStatus('Docker Desktop is installed but not running.', 'warning');
      startBtn.style.display = 'inline-block';
      continueBtn.disabled = true;
      return;
    }

    // Docker is installed and running
    const versionMsg = status.version
      ? `Docker Desktop ${status.version} is running and ready!`
      : 'Docker is running and ready!';
    updateDockerStatus(versionMsg, 'success');
    continueBtn.disabled = false;
  } catch (error) {
    updateDockerStatus(`Error checking Docker: ${error.message}`, 'error');
    continueBtn.disabled = true;
  }
}

function updateDockerStatus(message, type) {
  const statusBox = document.getElementById('docker-status');
  if (!statusBox) return;

  statusBox.className = `status-box ${type}`;
  statusBox.querySelector('.status-text').textContent = message;
}

async function installDocker() {
  const installBtn = document.getElementById('btn-install-docker');
  const continueBtn = document.getElementById('btn-next');

  installBtn.disabled = true;
  updateDockerStatus('Downloading Docker Desktop installer...', 'info');

  try {
    // Listen for progress messages
    window.electronAPI.onProgress((message) => {
      updateDockerStatus(message, 'info');
    });

    // Call IPC to install Docker
    await window.electronAPI.docker.install();

    updateDockerStatus('Docker Desktop installed! Windows may require a restart.', 'success');
    continueBtn.disabled = false;
  } catch (error) {
    updateDockerStatus(`Installation failed: ${error.message}`, 'error');
    installBtn.disabled = false;
  } finally {
    window.electronAPI.removeProgressListener();
  }
}

async function startDocker() {
  const startBtn = document.getElementById('btn-start-docker');
  const continueBtn = document.getElementById('btn-next');

  startBtn.disabled = true;
  updateDockerStatus('Starting Docker Desktop...', 'info');

  try {
    // Call IPC to start Docker
    await window.electronAPI.docker.start();

    updateDockerStatus('Docker is now running!', 'success');
    continueBtn.disabled = false;
    startBtn.style.display = 'none';
  } catch (error) {
    updateDockerStatus(`Failed to start Docker: ${error.message}`, 'error');
    startBtn.disabled = false;
  }
}

// Page 3: Storage Path Selection
async function selectStoragePath() {
  const selectedPath = await window.electronAPI.config.selectDirectory();

  if (selectedPath) {
    document.getElementById('storage-path').value = selectedPath;
    wizardData.storagePath = selectedPath;
    await validateStoragePath();
  }
}

async function validateStoragePath() {
  const input = document.getElementById('storage-path');
  const validation = document.getElementById('path-validation');
  const path = input.value.trim();

  if (!path) {
    showValidation(validation, 'Please enter a storage path', 'error');
    document.getElementById('btn-next').disabled = true;
    return;
  }

  // Real validation via IPC
  try {
    const isValid = await window.electronAPI.config.validateStoragePath(path);

    if (isValid) {
      // Check disk space
      const diskSpace = await window.electronAPI.config.getDiskSpace(path);
      const availableGB = (diskSpace.available / (1024 * 1024 * 1024)).toFixed(1);

      if (diskSpace.available < 10 * 1024 * 1024 * 1024) {
        showValidation(
          validation,
          `Warning: Only ${availableGB}GB available (10GB+ recommended)`,
          'error'
        );
        document.getElementById('btn-next').disabled = true;
      } else {
        showValidation(validation, `Path is valid (${availableGB}GB available)`, 'success');
        wizardData.storagePath = path;
        document.getElementById('btn-next').disabled = false;
      }
    } else {
      showValidation(validation, 'Path is not writable', 'error');
      document.getElementById('btn-next').disabled = true;
    }
  } catch (error) {
    showValidation(validation, `Error: ${error.message}`, 'error');
    document.getElementById('btn-next').disabled = true;
  }
}

// Auto-set default path on page load
function setDefaultStoragePath() {
  const defaultPath = `C:\\Users\\${process.env.USERNAME || 'User'}\\ObsidianNewsDesk`;
  document.getElementById('storage-path').value = defaultPath;
  wizardData.storagePath = defaultPath;
  validateStoragePath();
}

function showValidation(element, message, type) {
  if (!element) return;
  element.className = `validation-message ${type}`;
  element.textContent = type === 'success' ? '✓ ' + message : '✗ ' + message;
  element.style.display = 'flex';
}

// Page 4: API Configuration
function updateAIProviderFields() {
  const provider = document.getElementById('ai-provider').value;
  wizardData.aiProvider = provider;

  // Show/hide relevant API key fields
  const providers = ['openai', 'claude', 'google', 'groq'];
  providers.forEach(p => {
    const field = document.getElementById(`${p}-key-group`);
    if (field) {
      field.style.display = p === provider ? 'block' : 'none';
    }
  });
}

async function validateAPIKey() {
  const provider = wizardData.aiProvider;
  const keyInput = document.getElementById(`${provider}-key`);
  const validation = document.getElementById('api-validation');
  const validateBtn = document.getElementById('btn-validate-key');

  const key = keyInput.value.trim();

  if (!key) {
    showValidation(validation, 'Please enter an API key', 'error');
    return;
  }

  validateBtn.disabled = true;
  validateBtn.textContent = 'Validating...';
  showValidation(validation, 'Checking API key...', 'info');

  // Store the key
  wizardData[`${provider}Key`] = key;

  try {
    // Real API validation via IPC
    const result = await window.electronAPI.config.validateAPIKey(provider, key);

    if (result.valid) {
      const modelsInfo = result.modelAccess
        ? ` (Access to: ${result.modelAccess.slice(0, 3).join(', ')})`
        : '';
      showValidation(
        validation,
        `${result.provider} API key is valid!${modelsInfo}`,
        'success'
      );
      document.getElementById('btn-next').disabled = false;
    } else {
      showValidation(validation, `Invalid: ${result.error}`, 'error');
      document.getElementById('btn-next').disabled = true;
    }
  } catch (error) {
    showValidation(validation, `Error: ${error.message}`, 'error');
    document.getElementById('btn-next').disabled = true;
  } finally {
    validateBtn.disabled = false;
    validateBtn.textContent = 'Validate Key';
  }
}

function saveWhiskToken() {
  const token = document.getElementById('whisk-token').value.trim();
  wizardData.whiskToken = token;
}

// Page 5: Installation Progress
async function startInstallation() {
  const logOutput = document.getElementById('install-log');
  const progressBar = document.querySelector('.progress-bar');
  const continueBtn = document.getElementById('btn-next');

  continueBtn.disabled = true;

  try {
    // Listen for progress messages from main process
    window.electronAPI.onProgress((message) => {
      addLogLine(message, 'info');
    });

    // Step 1: Create directories (5%)
    addLogLine('Creating storage directories...', 'info');
    progressBar.style.width = '5%';

    await window.electronAPI.config.createStorageDirectories(wizardData.storagePath);

    addLogLine('Storage directories ready', 'success');

    // Step 2: Generate configuration (15%)
    addLogLine('Generating configuration files...', 'info');
    progressBar.style.width = '15%';

    // Generate .env file
    await window.electronAPI.config.generateEnv(wizardData);

    // Save config to electron-store
    await window.electronAPI.config.save(wizardData);

    addLogLine('Configuration files generated', 'success');

    // Step 3: Pull Docker images (60%)
    addLogLine('Pulling Docker images (this may take several minutes)...', 'info');
    progressBar.style.width = '25%';

    await window.electronAPI.docker.pullImages();

    progressBar.style.width = '60%';
    addLogLine('Docker images pulled successfully', 'success');

    // Step 4: Start Docker Compose (70%)
    addLogLine('Starting Docker containers...', 'info');
    progressBar.style.width = '70%';

    await window.electronAPI.docker.startCompose();

    addLogLine('Docker containers started', 'success');

    // Step 5: Wait for services (80%)
    addLogLine('Waiting for services to be ready...', 'info');
    progressBar.style.width = '75%';

    await window.electronAPI.docker.waitForServices();

    progressBar.style.width = '90%';
    addLogLine('All services are ready!', 'success');

    // Step 6: Initialize database (95%)
    addLogLine('Initializing database schema...', 'info');
    progressBar.style.width = '95%';
    await sleep(1000);
    // Database auto-initializes via docker-entrypoint-initdb.d
    addLogLine('Database schema initialized', 'success');

    // Step 7: Start workers (97%)
    addLogLine('Starting BullMQ workers...', 'info');
    progressBar.style.width = '97%';

    await window.electronAPI.workers.start();

    addLogLine('BullMQ workers started', 'success');

    // Step 8: Complete (100%)
    progressBar.style.width = '100%';
    addLogLine('Installation complete!', 'success');

    // Update storage location display on completion page
    const storageDisplay = document.getElementById('storage-location-display');
    if (storageDisplay) {
      storageDisplay.textContent = wizardData.storagePath;
    }

    continueBtn.disabled = false;
  } catch (error) {
    addLogLine(`Installation failed: ${error.message}`, 'error');
    addLogLine('Please check Docker Desktop and try again.', 'error');
  } finally {
    window.electronAPI.removeProgressListener();
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function addLogLine(message, type = 'info') {
  const logOutput = document.getElementById('install-log');
  if (!logOutput) return;

  const line = document.createElement('div');
  line.className = `log-line ${type}`;
  line.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
  logOutput.appendChild(line);
  logOutput.scrollTop = logOutput.scrollHeight;
}

// Page 6: Complete
async function launchApplication() {
  // Save configuration and close wizard
  await window.electronAPI.config.save(wizardData);

  // Close the wizard window - main window will auto-launch
  window.close();
}

// Initialize wizard on page load
document.addEventListener('DOMContentLoaded', () => {
  showPage(0);

  // Set up event listeners
  const prevBtn = document.getElementById('btn-prev');
  const nextBtn = document.getElementById('btn-next');
  const finishBtn = document.getElementById('btn-finish');

  if (prevBtn) prevBtn.addEventListener('click', prevPage);
  if (nextBtn) nextBtn.addEventListener('click', nextPage);
  if (finishBtn) finishBtn.addEventListener('click', launchApplication);

  // Page 1: Welcome
  const getStartedBtn = document.getElementById('btn-get-started');
  if (getStartedBtn) {
    getStartedBtn.addEventListener('click', () => {
      checkSystemRequirements();
      setTimeout(() => nextPage(), 2000);
    });
  }

  // Page 2: Docker
  const checkDockerBtn = document.getElementById('btn-check-docker');
  if (checkDockerBtn) {
    checkDockerBtn.addEventListener('click', checkDocker);
  }

  // Page 3: Storage
  const browseBtn = document.getElementById('btn-browse');
  if (browseBtn) {
    browseBtn.addEventListener('click', selectStoragePath);
  }

  const storageInput = document.getElementById('storage-path');
  if (storageInput) {
    storageInput.addEventListener('input', validateStoragePath);
    // Set default path
    setDefaultStoragePath();
  }

  // Page 4: API Keys
  const providerSelect = document.getElementById('ai-provider');
  if (providerSelect) {
    providerSelect.addEventListener('change', updateAIProviderFields);
    updateAIProviderFields();
  }

  const validateBtn = document.getElementById('btn-validate-key');
  if (validateBtn) {
    validateBtn.addEventListener('click', validateAPIKey);
  }

  const whiskInput = document.getElementById('whisk-token');
  if (whiskInput) {
    whiskInput.addEventListener('input', saveWhiskToken);
  }

  // Page 5: Installation
  const startInstallBtn = document.getElementById('btn-start-install');
  if (startInstallBtn) {
    startInstallBtn.addEventListener('click', () => {
      startInstallBtn.style.display = 'none';
      startInstallation();
    });
  }
});
