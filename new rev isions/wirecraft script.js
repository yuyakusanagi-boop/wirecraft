function createLightningPaths(startX, startY, endX, endY, jitter, branchCount = 2) {
  const deltaX = endX - startX;
  const deltaY = endY - startY;
  const length = Math.hypot(deltaX, deltaY);
  const directionX = deltaX / length;
  const directionY = deltaY / length;
  const normalX = -directionY;
  const normalY = directionX;
  const segmentCount = Math.max(7, Math.min(16, Math.round(length / 24)));
  const createPath = (fromX, fromY, toX, toY, segments, displacement) => {
    const pathDeltaX = toX - fromX;
    const pathDeltaY = toY - fromY;
    const pathLength = Math.hypot(pathDeltaX, pathDeltaY);
    const pathNormalX = -pathDeltaY / pathLength;
    const pathNormalY = pathDeltaX / pathLength;
    const points = [[fromX, fromY]];
    for (let index = 1; index < segments; index += 1) {
      const progress = index / segments;
      const taper = Math.sin(progress * Math.PI);
      const offset = (Math.random() - 0.5) * displacement * taper;
      points.push([
        fromX + pathDeltaX * progress + pathNormalX * offset,
        fromY + pathDeltaY * progress + pathNormalY * offset
      ]);
    }
    points.push([toX, toY]);
    return points;
  };
  const mainPath = createPath(startX, startY, endX, endY, segmentCount, jitter);
  const paths = [{ points: mainPath, branch: false }];

  for (let index = 0; index < branchCount; index += 1) {
    const junctionIndex = 2 + Math.floor(Math.random() * Math.max(1, segmentCount - 4));
    const [branchX, branchY] = mainPath[junctionIndex];
    const side = Math.random() < 0.5 ? -1 : 1;
    const branchLength = length * (0.12 + Math.random() * 0.2);
    const branchEndX = branchX + directionX * branchLength * 0.55 + normalX * side * branchLength * 0.85;
    const branchEndY = branchY + directionY * branchLength * 0.55 + normalY * side * branchLength * 0.85;
    paths.push({
      points: createPath(branchX, branchY, branchEndX, branchEndY, 3 + Math.floor(Math.random() * 2), branchLength * 0.16),
      branch: true
    });
  }
  return paths;
}

function strokeLightning(context, paths, scale = 1, palette = 'ice') {
  const colors = palette === 'warm'
    ? { glow: 'rgba(156, 99, 255, 0.24)', body: '#9d68ff', core: '#fff1b8' }
    : { glow: 'rgba(83, 190, 255, 0.24)', body: '#79d8ff', core: '#f2fcff' };
  const layers = [
    { width: 7 * scale, color: colors.glow, blur: 18 * scale },
    { width: 2.6 * scale, color: colors.body, blur: 10 * scale },
    { width: 0.85 * scale, color: colors.core, blur: 3 * scale }
  ];
  context.save();
  context.lineCap = 'round';
  context.lineJoin = 'round';
  paths.forEach(({ points, branch }) => {
    layers.forEach(({ width, color, blur }, layerIndex) => {
      context.beginPath();
      context.moveTo(points[0][0], points[0][1]);
      points.slice(1).forEach(([x, y]) => context.lineTo(x, y));
      context.strokeStyle = color;
      context.lineWidth = width * (branch ? 0.58 : 1);
      context.globalAlpha = branch ? 0.8 : 1;
      context.shadowBlur = blur;
      context.shadowColor = layerIndex === 2 ? colors.body : colors.glow;
      context.stroke();
    });
  });
  context.restore();
}

let supabaseClientPromise = null;

async function getSupabaseClient() {
  const config = window.WIRECRAFT_SUPABASE_CONFIG;
  if (!config?.url || !config?.anonKey || config.url.includes('YOUR_') || config.anonKey.includes('YOUR_')) {
    throw new Error('Supabase is not configured. Add your project URL and publishable key to supabase-config.js.');
  }
  if (!supabaseClientPromise) {
    supabaseClientPromise = import('https://esm.sh/@supabase/supabase-js@2.49.1')
      .then(({ createClient }) => createClient(config.url, config.anonKey));
  }
  return supabaseClientPromise;
}

document.addEventListener('DOMContentLoaded', () => {
  const loading = document.getElementById('loading-screen');
  const launchVerification = document.getElementById('launch-verification');
  const homeLaunchTrack = document.getElementById('loading-screen-track');
  const backgroundMusicTrack = document.getElementById('background-music-track');
  const home = document.getElementById('home-screen');
  const difficulty = document.getElementById('difficulty-screen');
  const lightningCanvas = document.getElementById('difficulty-lightning-canvas');
  const difficultyTitle = document.getElementById('difficulty-title');
  const beginnerLevels = document.getElementById('beginner-levels');
  const proLevels = document.getElementById('pro-levels');
  const expertLevels = document.getElementById('expert-levels');
  const modesScreen = document.getElementById('modes-screen');
  const gameShell = document.getElementById('game-shell');
  const statsScreen = document.getElementById('stats-screen');
  const modeStatsScreen = document.getElementById('mode-stats-screen');
  const infoScreen = document.getElementById('info-screen');
  const accountScreen = document.getElementById('account-screen');
  const leaderboardScreen = document.getElementById('leaderboard-screen');
  const accountStatus = document.getElementById('account-status');
  const accountSession = document.getElementById('account-session');
  const accountDisplayName = document.getElementById('account-display-name');
  const accountEmail = document.getElementById('account-email');
  const accountPassword = document.getElementById('account-password');
  const leaderboardStatus = document.getElementById('leaderboard-status');
  const leaderboardContent = document.getElementById('leaderboard-content');
  const leaderboardSourceNote = document.getElementById('leaderboard-source-note');
  const submitBtn = document.getElementById('submit-name');
  const nameInput = document.getElementById('player-name-input');
  const nameDisplay = document.getElementById('player-name-display');
  const changeNameBtn = document.getElementById('change-name');
  const storyBtn = document.getElementById('story-btn');
  const casualBtn = document.getElementById('casual-btn');
  const exitBtn = document.getElementById('exit-btn');
  const infoBtn = document.getElementById('info-btn');
  const statsBtn = document.getElementById('stats-btn');
  const statsBackBtn = document.getElementById('stats-back');
  const modeStatsOpenBtn = document.getElementById('mode-stats-open');
  const modeStatsBackBtn = document.getElementById('mode-stats-back');
  const infoBackBtn = document.getElementById('info-back');
  const backHomeBtn = document.getElementById('back-home');
  const returnLevelMapBtn = document.getElementById('return-level-map');
  const progressionKey = 'wirecraft-progress';
  const lastPlayedLevelKey = 'wirecraft-last-played-level';
  const playerDatabaseKey = 'wirecraft-player-database';
  const playerNameKey = 'wirecraft-player-name';
  const playerOwnerKey = 'wirecraft-player-owner-id';
  let activePlayerName = '';
  let supabaseClient = null;
  let authenticatedUserId = null;
  let authenticatedProfileLoaded = false;
  let profileSyncPromise = null;
  let cloudWriteQueue = Promise.resolve();
  let leaderboardChannel = null;
  let activeLeaderboardMode = 'overall';
  let activeLeaderboardSource = 'verified';
  let leaderboardLoadId = 0;
  let verificationRequestId = 0;
  let verificationChallengePromise = Promise.resolve(null);
  let soundEnabled = false;
  let lightningFrame = 0;
  let lightningResizeHandler = null;
  let difficultyPhotoHovered = false;
  let triggerDifficultyBolt = null;

  function startDifficultyLightning() {
    if (!lightningCanvas || lightningFrame) return;
    const context = lightningCanvas.getContext('2d');
    if (!context) return;

    const resizeCanvas = () => {
      const bounds = difficulty.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      lightningCanvas.width = Math.max(1, Math.floor(bounds.width * pixelRatio));
      lightningCanvas.height = Math.max(1, Math.floor(bounds.height * pixelRatio));
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };
    const drawBolt = (targetContext) => {
      const titleBounds = difficultyTitle.getBoundingClientRect();
      const difficultyBounds = difficulty.getBoundingClientRect();
      const centerX = titleBounds.left - difficultyBounds.left + titleBounds.width / 2;
      const centerY = titleBounds.top - difficultyBounds.top + titleBounds.height / 2;
      const startX = centerX + (Math.random() - 0.5) * titleBounds.width * 0.9;
      const startY = centerY - titleBounds.height * (0.7 + Math.random() * 0.4);
      const endX = centerX + (Math.random() - 0.5) * titleBounds.width * 0.9;
      const endY = centerY + titleBounds.height * (0.7 + Math.random() * 0.4);
      const paths = createLightningPaths(startX, startY, endX, endY, 40, 2 + Math.floor(Math.random() * 2));
      strokeLightning(targetContext, paths, 1);
    };
    triggerDifficultyBolt = () => {
      drawBolt(context);
    };
    let lastBoltDrawAt = 0;
    const render = () => {
      const width = difficulty.clientWidth;
      const height = difficulty.clientHeight;
      context.fillStyle = 'rgba(3, 7, 18, 0.088)';
      context.fillRect(0, 0, width, height);
      const now = performance.now();
      if (now - lastBoltDrawAt >= 1000 / 60 * 2.5) {
        if (Math.random() < (difficultyPhotoHovered ? 0.3 : 0.1467)) {
          drawBolt(context);
        }
        lastBoltDrawAt = now;
      }
      lightningFrame = window.requestAnimationFrame(render);
    };

    resizeCanvas();
    lightningResizeHandler = resizeCanvas;
    window.addEventListener('resize', lightningResizeHandler);
    render();
  }

  function stopDifficultyLightning() {
    if (lightningFrame) window.cancelAnimationFrame(lightningFrame);
    lightningFrame = 0;
    if (lightningResizeHandler) {
      window.removeEventListener('resize', lightningResizeHandler);
      lightningResizeHandler = null;
    }
    triggerDifficultyBolt = null;
  }
  
  const memoryFallbackStore = new Map();
  let localStorageAvailable = true;
  try {
    const probeKey = '__wirecraft_probe__';
    window.localStorage.setItem(probeKey, '1');
    window.localStorage.removeItem(probeKey);
  } catch (error) {
    localStorageAvailable = false;
  }

  function getStoredValue(key) {
    if (localStorageAvailable) {
      try {
        return window.localStorage.getItem(`wirecraft:${key}`);
      } catch (error) {
        localStorageAvailable = false;
      }
    }
    return memoryFallbackStore.has(key) ? memoryFallbackStore.get(key) : null;
  }

  function setStoredValue(key, value) {
    const payload = String(value);
    if (localStorageAvailable) {
      try {
        window.localStorage.setItem(`wirecraft:${key}`, payload);
        return;
      } catch (error) {
        localStorageAvailable = false;
      }
    }
    memoryFallbackStore.set(key, payload);
  }

  function setAccountStatus(message, isError = false) {
    if (!accountStatus) return;
    accountStatus.textContent = message;
    accountStatus.classList.toggle('is-error', isError);
  }

  function setLeaderboardStatus(message, isError = false) {
    if (!leaderboardStatus) return;
    leaderboardStatus.textContent = message;
    leaderboardStatus.classList.toggle('is-error', isError);
  }

  function canUseCloudServices() {
    const config = window.WIRECRAFT_SUPABASE_CONFIG;
    return Boolean(config?.url && config?.anonKey && !config.url.includes('YOUR_') && !config.anonKey.includes('YOUR_'));
  }

  function safeReadJson(value, fallback = {}) {
    if (value === null || value === undefined || value === '') return fallback;
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? parsed : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function sanitizePlayerName(name) {
    return String(name || '').replace(/\s+/g, ' ').trim().slice(0, 24);
  }

  function validatePlayerName(name, fieldLabel = 'Player name') {
    const sanitized = sanitizePlayerName(name);
    if (!sanitized) {
      throw new Error(`${fieldLabel} is required.`);
    }
    return sanitized;
  }

  function normalizePlayerRecord(record, fallbackName = activePlayerName) {
    if (!record || typeof record !== 'object') return null;
    record.profile = record.profile || {};
    const safeName = String(record.profile.name || record.name || fallbackName || 'Player').trim() || 'Player';
    record.profile.name = safeName;
    record.profile.createdAt = record.profile.createdAt || new Date().toISOString();
    record.profile.lastActiveAt = record.profile.lastActiveAt || new Date().toISOString();
    record.profile.lastLevel = Number(record.profile.lastLevel) || 1;
    record.sessions = Number(record.sessions) || 0;
    record.runtimeSeconds = Number(record.runtimeSeconds) || 0;
    record.levelsCleared = Number(record.levelsCleared) || 0;
    record.totalMoves = Number(record.totalMoves) || 0;
    record.correctMoves = Number(record.correctMoves) || 0;
    record.wrongMoves = Number(record.wrongMoves) || 0;
    record.bestClearTimeSeconds = Number(record.bestClearTimeSeconds) || null;
    record.levels = record.levels && typeof record.levels === 'object' ? record.levels : {};
    record.modeStats = record.modeStats && typeof record.modeStats === 'object' ? record.modeStats : {};
    ensureModeStats(record);
    return record;
  }

  function removePhotoBackground(image){
    if (window.location.protocol === 'file:') return;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context || !image.naturalWidth) return;
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    context.drawImage(image, 0, 0);

    let imageData;
    try {
      imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    } catch (error) {
      return;
    }
    const pixels = imageData.data;
    const visited = new Uint8Array(canvas.width * canvas.height);
    const queue = new Int32Array(canvas.width * canvas.height);
    let head = 0;
    let tail = 0;

    const nearWhite = (pixel) => {
      const r = pixels[pixel * 4];
      const g = pixels[pixel * 4 + 1];
      const b = pixels[pixel * 4 + 2];
      return r > 218 && g > 218 && b > 218 && Math.max(r, g, b) - Math.min(r, g, b) < 32;
    };
    const enqueue = (x, y) => {
      const pixel = y * canvas.width + x;
      if (!visited[pixel] && nearWhite(pixel)) {
        visited[pixel] = 1;
        queue[tail++] = pixel;
      }
    };

    for (let x = 0; x < canvas.width; x += 1) {
      enqueue(x, 0);
      enqueue(x, canvas.height - 1);
    }
    for (let y = 1; y < canvas.height - 1; y += 1) {
      enqueue(0, y);
      enqueue(canvas.width - 1, y);
    }

    while (head < tail) {
      const pixel = queue[head++];
      pixels[pixel * 4 + 3] = 0;
      const x = pixel % canvas.width;
      const y = Math.floor(pixel / canvas.width);
      if (x > 0) enqueue(x - 1, y);
      if (x < canvas.width - 1) enqueue(x + 1, y);
      if (y > 0) enqueue(x, y - 1);
      if (y < canvas.height - 1) enqueue(x, y + 1);
    }

    context.putImageData(imageData, 0, 0);
    image.src = canvas.toDataURL('image/png');
  }

  document.querySelectorAll('.map-character').forEach((image) => {
    if (image.complete) removePhotoBackground(image);
    else image.addEventListener('load', () => removePhotoBackground(image), { once: true });
  });

  function readPlayerDatabase() {
    return safeReadJson(getStoredValue(playerDatabaseKey), {});
  }

  function getPlayerRecordStorageKey(name = activePlayerName) {
    const ownerId = authenticatedUserId || getStoredValue(playerOwnerKey);
    return ownerId ? `account:${ownerId}` : name;
  }

  function getPlayerRecord() {
    if (!activePlayerName) return null;
    const database = readPlayerDatabase();
    const storageKey = getPlayerRecordStorageKey();
    const ownerId = authenticatedUserId || getStoredValue(playerOwnerKey);
    const legacyOwner = getStoredValue(playerOwnerKey);
    if (!database[storageKey] && ownerId && database[activePlayerName] &&
        (!legacyOwner || legacyOwner === ownerId)) {
      database[storageKey] = database[activePlayerName];
      delete database[activePlayerName];
      setStoredValue(playerDatabaseKey, JSON.stringify(database));
    }
    if (!database[storageKey]) {
      database[storageKey] = {
        profile: {
          name: activePlayerName,
          createdAt: new Date().toISOString(),
          lastActiveAt: new Date().toISOString(),
          lastLevel: 1
        },
        sessions: 0,
        runtimeSeconds: 0,
        levelsCleared: 0,
        totalMoves: 0,
        correctMoves: 0,
        wrongMoves: 0,
        bestClearTimeSeconds: null,
        levels: {},
        modeStats: {}
      };
      setStoredValue(playerDatabaseKey, JSON.stringify(database));
    }
    const normalizedRecord = normalizePlayerRecord(database[storageKey], activePlayerName);
    if (normalizedRecord) {
      database[storageKey] = normalizedRecord;
      normalizedRecord.profile.lastActiveAt = new Date().toISOString();
      setStoredValue(playerDatabaseKey, JSON.stringify(database));
      return normalizedRecord;
    }
    return database[storageKey];
  }

  function savePlayerRecord(record) {
    if (!record || !activePlayerName) return;
    const normalizedRecord = normalizePlayerRecord(record, activePlayerName);
    if (!normalizedRecord) return;
    const database = readPlayerDatabase();
    database[getPlayerRecordStorageKey()] = normalizedRecord;
    setStoredValue(playerDatabaseKey, JSON.stringify(database));
    if (authenticatedUserId && canUseCloudServices()) queueCloudSave(normalizedRecord);
  }

  function reportCloudError(error) {
    console.error('Wirecraft cloud sync failed:', error);
    const message = error?.message || 'Unknown cloud sync error.';
    setAccountStatus(`Cloud sync failed: ${message}`, true);
    setLeaderboardStatus(`Leaderboard update failed: ${message}`, true);
  }

  function getAuthErrorMessage(error) {
    const message = error?.message || 'Unknown authentication error.';
    const normalizedMessage = message.toLowerCase();
    if (normalizedMessage.includes('email address not authorized')) {
      return 'Supabase could not send the confirmation email. The default mailer only delivers to project team addresses; configure custom SMTP for other recipients.';
    }
    if (normalizedMessage.includes('email rate limit exceeded') ||
        normalizedMessage.includes('rate limit exceeded')) {
      return 'The email sending limit was reached. Wait before retrying, or configure custom SMTP and an appropriate email rate limit.';
    }
    return message;
  }

  function queueCloudSave(record) {
    if (!authenticatedUserId || !record || !canUseCloudServices()) return;
    const userId = authenticatedUserId;
    const snapshot = JSON.parse(JSON.stringify(record));
    cloudWriteQueue = cloudWriteQueue.then(async () => {
      const client = await getSupabaseClient();
      const { error: profileError } = await client.from('player_profiles').upsert({
        user_id: userId,
        username: snapshot.profile.name,
        record: snapshot,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });
      if (profileError) {
        if (profileError.code === '23505' &&
            profileError.message?.includes('player_profiles_username_lower_key')) {
          throw new Error('That player name is already in use. Choose a different name to sync your account.');
        }
        throw profileError;
      }

      if (authenticatedUserId === userId) {
        setAccountStatus('Signed in. Player data is synced. New circuit clears can be submitted for server verification.');
      }
    }).catch((error) => {
      reportCloudError(error);
    });
  }

  function requestVerifiedChallenge(mode, level) {
    const requestId = ++verificationRequestId;
    verificationChallengePromise = Promise.resolve(null);
    if (!authenticatedUserId || !canUseCloudServices()) return;

    verificationChallengePromise = (async () => {
      const client = supabaseClient || await getSupabaseClient();
      supabaseClient = client;
      const { data, error } = await client.functions.invoke('submit-verified-score', {
        body: { action: 'start', mode, level }
      });
      if (error) throw new Error(error.message || 'Could not start a verified circuit challenge.');
      if (!data?.ok || typeof data.challengeId !== 'string') {
        throw new Error('The server did not issue a verified circuit challenge.');
      }
      return data;
    })().catch((error) => {
      if (requestId === verificationRequestId) {
        const message = error.message || 'Unknown challenge error.';
        setAccountStatus(`Verified challenge unavailable: ${message}`, true);
        showToast('This circuit will remain player-reported.');
      }
      return null;
    });
  }

  async function submitVerifiedCompletion(challengePromise, proof) {
    try {
      const challenge = await challengePromise;
      if (!challenge) {
        showToast(authenticatedUserId
          ? 'This completion remains player-reported.'
          : 'Sign in online to submit verified circuit completions.');
        return;
      }

      const client = supabaseClient || await getSupabaseClient();
      supabaseClient = client;
      const { data, error } = await client.functions.invoke('submit-verified-score', {
        body: {
          action: 'complete',
          challengeId: challenge.challengeId,
          proof
        }
      });
      if (error) throw new Error(error.message || 'The server rejected this circuit proof.');
      if (!data?.ok) throw new Error('The server did not record this circuit as verified.');
      setAccountStatus(
        `Server-verified ${data.mode} circuit ${data.level} recorded. Verified completions: ${data.overallScore}.`
      );
      showToast('Server-verified circuit recorded.', true);
    } catch (error) {
      const message = error.message || 'Unknown verification error.';
      setAccountStatus(`Circuit saved locally but not verified: ${message}`, true);
      showToast('Circuit saved locally but was not verified.');
    }
  }

  function ensureModeStats(record) {
    if (!record) return {};
    record.modeStats = record.modeStats || {};
    ['practice', 'rush', 'endless'].forEach((mode) => {
      record.modeStats[mode] = record.modeStats[mode] || {
        sessions: 0, circuitsCleared: 0, bestTimeSeconds: null,
        bestMoves: null, bestStreak: 0, failedRuns: 0
      };
    });
    return record.modeStats;
  }

  function renameActivePlayer(newName) {
    const nextName = sanitizePlayerName(newName);
    if (!nextName) return;
    if (!activePlayerName || activePlayerName === nextName) return;
    const record = getPlayerRecord();
    if (!record) return;
    const database = readPlayerDatabase();
    const oldStorageKey = getPlayerRecordStorageKey();
    const newStorageKey = getPlayerRecordStorageKey(nextName);
    record.profile.name = nextName;
    record.profile.lastActiveAt = new Date().toISOString();
    database[newStorageKey] = record;
    if (oldStorageKey !== newStorageKey) delete database[oldStorageKey];
    setStoredValue(playerDatabaseKey, JSON.stringify(database));
  }

  function renderPlayerStats() {
    const record = getPlayerRecord();
    const name = record?.profile?.name || activePlayerName || 'No player profile selected';
    const values = record ? [
      ['Profile created', new Date(record.profile.createdAt).toLocaleDateString()],
      ['Last active', new Date(record.profile.lastActiveAt).toLocaleString()],
      ['Last level', record.profile.lastLevel],
      ['Sessions', record.sessions],
      ['Levels cleared', record.levelsCleared],
      ['Total runtime', formatDuration(record.runtimeSeconds)],
      ['Total moves', record.totalMoves],
      ['Correct moves', record.correctMoves],
      ['Wrong moves', record.wrongMoves],
      ['Best clear time', record.bestClearTimeSeconds === null ? '—' : formatDuration(record.bestClearTimeSeconds)]
    ] : [];

    const statsNameEl = document.getElementById('stats-player-name');
    if (statsNameEl) statsNameEl.textContent = name;
    const statsGridEl = document.getElementById('stats-grid');
    if (statsGridEl) {
      statsGridEl.innerHTML = values.length
        ? values.map(([label, value]) => `<div class="stat-record"><span>${label}</span><b>${value}</b></div>`).join('')
        : '<div class="stats-empty">Create a player profile to begin recording your circuit progress.</div>';
    }
  }

  function renderModeStats() {
    const record = getPlayerRecord();
    const name = record?.profile?.name || activePlayerName || 'No player profile selected';
    const modes = ensureModeStats(record);
    const labels = { practice: 'Practice Lab', rush: 'Power Rush', endless: 'Endless Grid' };
    const values = record ? Object.entries(labels).flatMap(([mode, label]) => {
      const stat = modes[mode];
      return [
        [`${label} sessions`, stat.sessions],
        [`${label} circuits cleared`, stat.circuitsCleared],
        [mode === 'endless' ? 'Best Endless streak' : `${label} fastest clear`, mode === 'endless' ? stat.bestStreak : (stat.bestTimeSeconds === null ? '—' : formatDuration(stat.bestTimeSeconds))],
        [`${label} fewest moves`, stat.bestMoves === null ? '—' : stat.bestMoves],
        [`${label} failed runs`, stat.failedRuns]
      ];
    }) : [];
    const modeStatsNameEl = document.getElementById('mode-stats-player-name');
    if (modeStatsNameEl) modeStatsNameEl.textContent = name;
    const modeStatsGridEl = document.getElementById('mode-stats-grid');
    if (modeStatsGridEl) {
      modeStatsGridEl.innerHTML = values.length
        ? values.map(([label, value]) => {
          const marker = label === 'Endless Grid failed runs' ? ' endless-failed-runs' : '';
          return `<div class="stat-record${marker}"><span>${label}</span><b>${value}</b></div>`;
        }).join('')
        : '<div class="stats-empty">Create a player profile to begin recording mode progress.</div>';
    }
  }

  function restoreSavedPlayer() {
    const savedName = getStoredValue(playerNameKey)?.trim();
    if (!savedName) return;
    activePlayerName = savedName;
    getPlayerRecord();
    if (nameDisplay) nameDisplay.textContent = `👤 ${savedName}`;
    const entry = document.getElementById('name-entry');
    if (entry) entry.style.display = 'none';
  }

  restoreSavedPlayer();

  function updateAccountControls(user = null) {
    const signedIn = Boolean(user);
    if (accountSession) {
      accountSession.textContent = signedIn ? `Signed in as ${user.email}` : 'Not signed in';
    }
    const signUpButton = document.getElementById('account-signup');
    const signInButton = document.getElementById('account-signin');
    const signOutButton = document.getElementById('account-signout');
    if (signUpButton) signUpButton.hidden = signedIn;
    if (signInButton) signInButton.hidden = signedIn;
    if (signOutButton) signOutButton.hidden = !signedIn;
    if (accountDisplayName) accountDisplayName.disabled = signedIn;
  }

  async function syncAuthenticatedPlayer(user) {
    if (authenticatedUserId === user.id && authenticatedProfileLoaded) return;
    if (profileSyncPromise) await profileSyncPromise;
    if (authenticatedUserId === user.id && authenticatedProfileLoaded) return;
    authenticatedUserId = user.id;
    authenticatedProfileLoaded = false;
    const syncPromise = (async () => {
      updateAccountControls(user);
      const client = supabaseClient || await getSupabaseClient();
      supabaseClient = client;
      const { data: cloudProfile, error } = await client.from('player_profiles')
        .select('username,record')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;

      const localName = activePlayerName;
      const localDatabase = readPlayerDatabase();
      const localOwner = getStoredValue(playerOwnerKey);
      const localRecord = localName
        ? localDatabase[`account:${user.id}`] ||
          ((!localOwner || localOwner === user.id) ? localDatabase[localName] : null)
        : null;
      const accountName = validatePlayerName(
        cloudProfile?.username ||
        user.user_metadata?.display_name ||
        localName ||
        user.email?.split('@')[0] ||
        'Player',
        'Player name'
      );

      const record = cloudProfile?.record || localRecord || null;
      activePlayerName = accountName;
      if (record) {
        record.profile = record.profile || {};
        record.profile.name = accountName;
        record.profile.lastActiveAt = new Date().toISOString();
      }
      const activeRecord = record || getPlayerRecord();
      activeRecord.profile.createdAt = activeRecord.profile.createdAt || new Date().toISOString();
      activeRecord.profile.lastActiveAt = activeRecord.profile.lastActiveAt || new Date().toISOString();
      activeRecord.profile.lastLevel = Number(activeRecord.profile.lastLevel) || 1;
      activeRecord.sessions = Number(activeRecord.sessions) || 0;
      activeRecord.levelsCleared = Number(activeRecord.levelsCleared) || 0;
      activeRecord.unlockedLevelCap = Math.min(Math.max(Number(
        cloudProfile?.record?.unlockedLevelCap ||
        (localRecord && (!localOwner || localOwner === user.id) ? getUnlockedLevelCap() : 1)
      ) || 1, 1), 30);
      if (!activeRecord.bestMovesByLevel && !cloudProfile && localRecord) {
        try {
          activeRecord.bestMovesByLevel = JSON.parse(getStoredValue(bestKey) || '{}');
        } catch (error) {
          activeRecord.bestMovesByLevel = {};
        }
      }
      activeRecord.bestMovesByLevel = activeRecord.bestMovesByLevel || {};
      setStoredValue(progressionKey, String(activeRecord.unlockedLevelCap));
      setStoredValue(bestKey, JSON.stringify(activeRecord.bestMovesByLevel));
      if (activeRecord.profile.lastLevel) {
        setStoredValue(lastPlayedLevelKey, String(activeRecord.profile.lastLevel));
      }
      savePlayerRecord(activeRecord);
      setStoredValue(playerNameKey, accountName);
      setStoredValue(playerOwnerKey, user.id);
      if (nameDisplay) nameDisplay.textContent = `👤 ${accountName}`;
      const nameEntry = document.getElementById('name-entry');
      if (nameEntry) nameEntry.style.display = 'none';
      if (accountDisplayName) accountDisplayName.value = accountName;
      authenticatedProfileLoaded = true;
      setAccountStatus(cloudProfile
        ? 'Signed in. Your online player record is synced.'
        : 'Signed in. Your saved player record was migrated to your account.');
      updateLevelButtonAvailability();
    })();
    profileSyncPromise = syncPromise;
    try {
      await syncPromise;
    } finally {
      if (profileSyncPromise === syncPromise) profileSyncPromise = null;
    }
  }

  async function initializeSupabaseAuth() {
    if (!canUseCloudServices()) {
      updateAccountControls();
      setAccountStatus('Offline mode: local saves are active. Configure Supabase to enable account sync and leaderboards.', false);
      if (leaderboardStatus) leaderboardStatus.textContent = 'Cloud leaderboards are offline until Supabase is configured.';
      return;
    }
    try {
      supabaseClient = await getSupabaseClient();
      const { data, error } = await supabaseClient.auth.getSession();
      if (error) throw error;
      supabaseClient.auth.onAuthStateChange((_event, session) => {
        window.setTimeout(() => {
          if (session?.user) {
            syncAuthenticatedPlayer(session.user).catch((syncError) => {
              reportCloudError(syncError);
            });
          } else {
            authenticatedUserId = null;
            authenticatedProfileLoaded = false;
            updateAccountControls();
            setAccountStatus('Not signed in. Your current browser save remains available.');
          }
        }, 0);
      });
      if (data.session?.user) await syncAuthenticatedPlayer(data.session.user);
      else {
        updateAccountControls();
        setAccountStatus('Create an account or sign in to sync your player data.');
      }
    } catch (error) {
      updateAccountControls();
      setAccountStatus(error.message, true);
    }
  }

  async function createAccount() {
    const signUpButton = document.getElementById('account-signup');
    if (signUpButton?.disabled) return;
    const email = accountEmail?.value.trim();
    const password = accountPassword?.value || '';
    const displayName = sanitizePlayerName(accountDisplayName?.value);
    if (!email || !password || !displayName) {
      setAccountStatus('Enter a player name, email, and password to create an account.', true);
      return;
    }
    if (displayName.length > 24) {
      setAccountStatus('Player names must be 24 characters or fewer.', true);
      accountDisplayName?.focus();
      return;
    }
    if (accountEmail && !accountEmail.validity.valid) {
      setAccountStatus('Enter a valid email address.', true);
      accountEmail.focus();
      return;
    }
    if (password.length < 8) {
      setAccountStatus('Use a password with at least 8 characters.', true);
      accountPassword?.focus();
      return;
    }
    if (signUpButton) signUpButton.disabled = true;
    try {
      const client = supabaseClient || await getSupabaseClient();
      supabaseClient = client;
      setAccountStatus('Creating your account…');
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName },
          emailRedirectTo: window.location.origin
        }
      });
      if (error) throw error;
      if (data.session?.user) {
        await syncAuthenticatedPlayer(data.session.user);
      } else {
        setAccountStatus('Sign-up received. If email confirmation is enabled for this project, follow the link sent to your inbox before signing in.');
      }
      if (accountPassword) accountPassword.value = '';
    } catch (error) {
      setAccountStatus(getAuthErrorMessage(error), true);
    } finally {
      if (signUpButton) signUpButton.disabled = false;
    }
  }

  async function signInAccount() {
    const email = accountEmail?.value.trim();
    const password = accountPassword?.value || '';
    if (!email || !password) {
      setAccountStatus('Enter your email and password to sign in.', true);
      return;
    }
    try {
      const client = supabaseClient || await getSupabaseClient();
      supabaseClient = client;
      setAccountStatus('Signing in…');
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data.user) await syncAuthenticatedPlayer(data.user);
      if (accountPassword) accountPassword.value = '';
    } catch (error) {
      setAccountStatus(getAuthErrorMessage(error), true);
    }
  }

  async function signOutAccount() {
    try {
      if (!supabaseClient) return;
      await cloudWriteQueue;
      const { error } = await supabaseClient.auth.signOut();
      if (error) throw error;
      authenticatedUserId = null;
      authenticatedProfileLoaded = false;
      setAccountStatus('Signed out. Your current browser save remains available.');
      updateAccountControls();
    } catch (error) {
      setAccountStatus(error.message, true);
    }
  }

  function exportLocalSave() {
    const payload = readPlayerDatabase();
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const timeStamp = new Date().toISOString().replace(/[:.]/g, '-');
    link.href = url;
    link.download = `wirecraft-save-${timeStamp}.json`;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      link.remove();
      URL.revokeObjectURL(url);
    }, 150);
    setAccountStatus('Local save exported as a JSON backup.');
  }

  function importLocalSave() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.addEventListener('change', async (event) => {
      const [file] = event.target.files || [];
      if (!file) return;
      try {
        const text = await file.text();
        const parsed = safeReadJson(text, null);
        if (!parsed || typeof parsed !== 'object') {
          throw new Error('The selected file is not a valid Wirecraft save export.');
        }
        const database = parsed;
        const entries = Object.entries(database).filter(([, value]) => value && typeof value === 'object');
        if (!entries.length) {
          throw new Error('No save data was found in this file.');
        }
        const merged = readPlayerDatabase();
        entries.forEach(([key, value]) => {
          const normalized = normalizePlayerRecord(value, key);
          if (normalized) merged[key] = normalized;
        });
        setStoredValue(playerDatabaseKey, JSON.stringify(merged));
        const firstEntry = entries[0]?.[1];
        const importedName = normalizePlayerRecord(firstEntry, 'Player')?.profile?.name || 'Player';
        activePlayerName = importedName;
        setStoredValue(playerNameKey, importedName);
        if (nameDisplay) nameDisplay.textContent = `👤 ${importedName}`;
        const entry = document.getElementById('name-entry');
        if (entry) entry.style.display = 'none';
        const record = getPlayerRecord();
        if (record) savePlayerRecord(record);
        setAccountStatus('Local save imported successfully.');
      } catch (error) {
        setAccountStatus(error.message || 'Unable to import the selected save file.', true);
      } finally {
        input.value = '';
      }
    }, { once: true });
    input.click();
  }

  function resetLocalSave() {
    const playerName = activePlayerName || getStoredValue(playerNameKey) || 'Player';
    const confirmed = window.confirm(`Reset the local save for ${playerName}? This clears saved progress and cannot be undone.`);
    if (!confirmed) return;
    setStoredValue(playerDatabaseKey, JSON.stringify({}));
    setStoredValue(playerOwnerKey, '');
    setStoredValue(playerNameKey, '');
    setStoredValue(progressionKey, '1');
    setStoredValue(lastPlayedLevelKey, '1');
    if (nameDisplay) nameDisplay.textContent = '👤';
    const entry = document.getElementById('name-entry');
    if (entry) entry.style.display = 'flex';
    activePlayerName = '';
    const accountName = document.getElementById('account-display-name');
    if (accountName) accountName.value = '';
    setAccountStatus('Local save reset. Start a fresh save or sign in again.', false);
  }

  async function loadLeaderboard() {
    if (!leaderboardContent) return;
    const loadId = ++leaderboardLoadId;
    const mode = activeLeaderboardMode;
    const isUnverified = activeLeaderboardSource === 'unverified';
    const tableName = isUnverified ? 'unverified_leaderboard_scores' : 'leaderboard_scores';
    leaderboardContent.replaceChildren();
    if (!canUseCloudServices()) {
      leaderboardContent.innerHTML = '<p class="leaderboard-empty">Cloud leaderboards are unavailable until Supabase is configured.</p>';
      setLeaderboardStatus('Cloud leaderboard offline. Local progress remains available.', false);
      return;
    }
    setLeaderboardStatus('Loading leaderboard…');
    try {
      const client = supabaseClient || await getSupabaseClient();
      supabaseClient = client;
      const { data, error } = await client.from(tableName)
        .select('user_id,display_name,mode,score,story_clears,practice_clears,rush_clears,endless_clears,best_endless_streak,updated_at')
        .eq('mode', mode)
        .gt('score', 0)
        .order('score', { ascending: false })
        .order('best_endless_streak', { ascending: false })
        .limit(50);
      if (error) throw error;
      if (loadId !== leaderboardLoadId) return;
      const table = document.createElement('table');
      table.className = 'leaderboard-table';
      const head = document.createElement('thead');
      const headerRow = document.createElement('tr');
      const columns = mode === 'overall'
        ? ['Rank', 'Player', 'Total circuits', 'Story', 'Practice', 'Power Rush', 'Endless', 'Best streak']
        : mode === 'endless'
        ? ['Rank', 'Player', 'Best streak', 'Endless circuits']
        : ['Rank', 'Player', 'Circuits cleared', 'Best Endless streak'];
      columns.forEach((label) => {
        const cell = document.createElement('th');
        cell.scope = 'col';
        cell.textContent = label;
        headerRow.appendChild(cell);
      });
      head.appendChild(headerRow);
      table.appendChild(head);
      const body = document.createElement('tbody');
      (data || []).forEach((entry, index) => {
        const row = document.createElement('tr');
        if (entry.user_id === authenticatedUserId) row.classList.add('leaderboard-self');
        const values = mode === 'overall'
          ? [index + 1, entry.display_name, entry.score, entry.story_clears, entry.practice_clears, entry.rush_clears, entry.endless_clears, entry.best_endless_streak]
          : mode === 'endless'
          ? [index + 1, entry.display_name, entry.best_endless_streak, entry.endless_clears]
          : [index + 1, entry.display_name, entry.score, entry.best_endless_streak];
        values.forEach((value, valueIndex) => {
          const cell = document.createElement('td');
          cell.textContent = valueIndex === 1 && entry.user_id === authenticatedUserId
            ? `${value} (you)`
            : String(value ?? 0);
          row.appendChild(cell);
        });
        body.appendChild(row);
      });
      table.appendChild(body);
      if (!data?.length) {
        const empty = document.createElement('p');
        empty.className = 'leaderboard-empty';
        empty.textContent = isUnverified
          ? 'No player-reported scores have been uploaded yet.'
          : 'No verified scores are available yet.';
        leaderboardContent.appendChild(empty);
      } else {
        leaderboardContent.appendChild(table);
      }
      setLeaderboardStatus(data?.length
        ? `${isUnverified ? 'Unverified player-reported scores' : 'Verified rankings'} · top 50 players`
        : isUnverified ? 'No player-reported scores are available yet.' : 'No verified scores are available yet.');
    } catch (error) {
      if (loadId !== leaderboardLoadId) return;
      setLeaderboardStatus(error.message, true);
      const empty = document.createElement('p');
      empty.className = 'leaderboard-empty';
      empty.textContent = 'Could not load scores. Verify Supabase setup and database policies.';
      leaderboardContent.appendChild(empty);
    }
  }

  async function subscribeToLeaderboard() {
    if (!canUseCloudServices()) return;
    try {
      const client = supabaseClient || await getSupabaseClient();
      supabaseClient = client;
      if (leaderboardChannel) await client.removeChannel(leaderboardChannel);
      leaderboardChannel = client.channel('wirecraft-leaderboard')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'leaderboard_scores'
        }, () => {
          if (leaderboardScreen?.style.display !== 'none') loadLeaderboard();
        })
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'unverified_leaderboard_scores'
        }, () => {
          if (leaderboardScreen?.style.display !== 'none') loadLeaderboard();
        })
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            setLeaderboardStatus(`Realtime connection status: ${status}. Rankings will refresh when reopened.`, true);
          }
        });
    } catch (error) {
      setLeaderboardStatus(error.message, true);
    }
  }

  document.getElementById('account-btn')?.addEventListener('click', () => {
    if (accountDisplayName && !accountDisplayName.value) accountDisplayName.value = activePlayerName;
    showScreen(accountScreen);
  });
  document.getElementById('account-back')?.addEventListener('click', () => showScreen(home));
  document.getElementById('account-signup')?.addEventListener('click', createAccount);
  document.getElementById('account-signin')?.addEventListener('click', signInAccount);
  document.getElementById('account-signout')?.addEventListener('click', signOutAccount);
  document.getElementById('account-export-save')?.addEventListener('click', exportLocalSave);
  document.getElementById('account-import-save')?.addEventListener('click', importLocalSave);
  document.getElementById('account-reset-save')?.addEventListener('click', resetLocalSave);
  document.getElementById('leaderboard-btn')?.addEventListener('click', () => {
    activeLeaderboardMode = 'overall';
    activeLeaderboardSource = 'verified';
    document.querySelectorAll('.leaderboard-tab').forEach((tab) => {
      const selected = tab.dataset.leaderboardMode === activeLeaderboardMode;
      tab.classList.toggle('is-active', selected);
      tab.setAttribute('aria-pressed', String(selected));
    });
    document.querySelectorAll('.leaderboard-source-tab').forEach((tab) => {
      const selected = tab.dataset.leaderboardSource === activeLeaderboardSource;
      tab.classList.toggle('is-active', selected);
      tab.setAttribute('aria-pressed', String(selected));
    });
    if (leaderboardSourceNote) {
      leaderboardSourceNote.textContent = 'Verified scores require a server-validated circuit solution. Each mode and level counts once per UTC day; old totals stay player-reported.';
    }
    showScreen(leaderboardScreen);
    loadLeaderboard();
    subscribeToLeaderboard();
  });
  document.getElementById('leaderboard-back')?.addEventListener('click', async () => {
    if (leaderboardChannel && supabaseClient) {
      await supabaseClient.removeChannel(leaderboardChannel);
      leaderboardChannel = null;
    }
    showScreen(home);
  });
  document.querySelectorAll('.leaderboard-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      activeLeaderboardMode = tab.dataset.leaderboardMode || 'overall';
      document.querySelectorAll('.leaderboard-tab').forEach((candidate) => {
        const selected = candidate === tab;
        candidate.classList.toggle('is-active', selected);
        candidate.setAttribute('aria-pressed', String(selected));
      });
      loadLeaderboard();
    });
  });
  document.querySelectorAll('.leaderboard-source-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      activeLeaderboardSource = tab.dataset.leaderboardSource || 'verified';
      document.querySelectorAll('.leaderboard-source-tab').forEach((candidate) => {
        const selected = candidate === tab;
        candidate.classList.toggle('is-active', selected);
        candidate.setAttribute('aria-pressed', String(selected));
      });
      if (leaderboardSourceNote) {
        leaderboardSourceNote.textContent = activeLeaderboardSource === 'unverified'
          ? 'Player-reported scores are not checked for fairness and do not count toward verified rankings.'
          : 'Verified scores require a server-validated circuit solution. Each mode and level counts once per UTC day; old totals stay player-reported.';
      }
      loadLeaderboard();
    });
  });
  initializeSupabaseAuth();

  const difficultyRanges = {
    beginner: { start: 1, end: 10, screen: beginnerLevels },
    pro: { start: 11, end: 20, screen: proLevels },
    expert: { start: 21, end: 30, screen: expertLevels }
  };

  function getUnlockedLevelCap() {
    try {
      const raw = Number.parseInt(getStoredValue(progressionKey) || '1', 10);
      if (!Number.isFinite(raw)) return 1;
      return Math.min(Math.max(raw, 1), 30);
    } catch (error) {
      return 1;
    }
  }

  function updateLevelButtonAvailability() {
    const maxUnlocked = getUnlockedLevelCap();
    document.querySelectorAll('.level-btn').forEach((btn) => {
      const screenId = btn.closest('.level-screen')?.id || 'beginner-levels';
      const difficultyKey = difficultyByScreen[screenId] || 'beginner';
      const range = difficultyRanges[difficultyKey];
      const buttonIndex = Number((btn.textContent || '').match(/\d+/)?.[0] || 1);
      const levelNumber = range.start + buttonIndex - 1;
      const unlocked = levelNumber <= maxUnlocked;
      btn.disabled = !unlocked;
      btn.setAttribute('aria-disabled', String(!unlocked));
      btn.classList.toggle('locked', !unlocked);
      btn.title = unlocked ? `Open level ${levelNumber}` : `Clear level ${Math.max(1, levelNumber - 1)} first`;
      if (!unlocked) {
        btn.setAttribute('data-locked', 'true');
      } else {
        btn.removeAttribute('data-locked');
      }
    });

    const proBtn = document.getElementById('pro-btn');
    const expertBtn = document.getElementById('expert-btn');
    if (proBtn) {
      const locked = maxUnlocked < 11;
      proBtn.classList.toggle('locked', locked);
      proBtn.setAttribute('aria-disabled', String(locked));
    }
    if (expertBtn) {
      const locked = maxUnlocked < 21;
      expertBtn.classList.toggle('locked', locked);
      expertBtn.setAttribute('aria-disabled', String(locked));
    }
    positionMapCharacters();
  }

  function moveMapCharacter(character, button) {
    const map = character.closest('.level-map');
    if (!map || !button) return;
    character.classList.add('is-moving');
    character.style.left = `${button.offsetLeft + button.offsetWidth / 2}px`;
    character.style.top = `${button.offsetTop + button.offsetHeight / 2}px`;
    window.setTimeout(() => character.classList.remove('is-moving'), 700);
  }

  function positionMapCharacters() {
    document.querySelectorAll('.level-map').forEach((map) => {
      const character = map.querySelector('.map-character');
      const screenId = map.closest('.level-screen')?.id || 'beginner-levels';
      const difficultyKey = difficultyByScreen[screenId] || 'beginner';
      const range = difficultyRanges[difficultyKey];
      const maxUnlocked = getUnlockedLevelCap();
      const lastPlayed = Number.parseInt(getStoredValue(lastPlayedLevelKey) || '', 10);
      const rememberedLevel = Number.isFinite(lastPlayed) ? lastPlayed : maxUnlocked;
      const targetLevel = Math.min(range.end, Math.max(range.start, Math.min(rememberedLevel, maxUnlocked)));
      const targetButton = [...map.querySelectorAll('.level-btn')].find((button) => {
        const buttonIndex = Number((button.textContent || '').match(/\d+/)?.[0] || 1);
        return range.start + buttonIndex - 1 === targetLevel;
      });
      const fallbackButton = [...map.querySelectorAll('.level-btn')].find((button) => !button.disabled);
      if (character && (targetButton || fallbackButton)) moveMapCharacter(character, targetButton || fallbackButton);
    });
  }

  function blurActiveElement() {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }

  const difficultyByScreen = {
    'beginner-levels': 'beginner',
    'pro-levels': 'pro',
    'expert-levels': 'expert'
  };

  function showScreen(screen) {
    if (!screen) return;
    blurActiveElement();
    updateLevelButtonAvailability();
    document.querySelectorAll('.screen').forEach((currentScreen) => {
      const isTarget = currentScreen === screen;
      currentScreen.style.display = isTarget ? 'flex' : 'none';
      currentScreen.setAttribute('aria-hidden', String(!isTarget));
    });
    if (screen === difficulty) startDifficultyLightning();
    else stopDifficultyLightning();
    window.requestAnimationFrame(positionMapCharacters);
    if (screen === home) {
      focusHomeScreen();
    } else {
      const firstButton = screen.querySelector('button');
      if (firstButton) firstButton.focus();
    }
  }

  function showGame(levelNumber = 1, requestedMode = 'story') {
    if (profileSyncPromise) {
      showMenuToast('Your account is still syncing. Try again shortly.');
      return;
    }
    blurActiveElement();
    if (returnLevelMapBtn) returnLevelMapBtn.hidden = requestedMode !== 'story';
    const screens = [home, difficulty, beginnerLevels, proLevels, expertLevels, modesScreen, statsScreen, modeStatsScreen];
    screens.forEach((screen) => {
      if (screen) {
        screen.style.display = 'none';
        screen.setAttribute('aria-hidden', 'true');
      }
    });
    if (gameShell) {
      gameShell.style.display = 'block';
      gameShell.setAttribute('aria-hidden', 'false');
    }

    sessionStartedAt = Date.now();
    sessionRecordedAt = 0;
    const record = getPlayerRecord();
    if (record) {
      record.sessions++;
      if (requestedMode !== 'story') ensureModeStats(record)[requestedMode].sessions++;
      savePlayerRecord(record);
    }
    const maxUnlocked = getUnlockedLevelCap();
    const safeLevel = Math.min(Math.max(Number(levelNumber) || 1, 1), maxUnlocked);
    if (requestedMode === 'story') {
      setStoredValue(lastPlayedLevelKey, String(safeLevel));
      const activeRecord = getPlayerRecord();
      if (activeRecord) {
        activeRecord.profile.lastLevel = safeLevel;
        savePlayerRecord(activeRecord);
      }
    }
    gameMode = requestedMode;
    modeLevelCeiling = requestedMode === 'practice' || requestedMode === 'rush'
      ? maxUnlocked
      : 30;
    endlessStreak = 0;
    buildLevel(safeLevel);
    startBackgroundMusic();
  }

  function startOpeningTrack() {
    if (!homeLaunchTrack || !soundEnabled || loading?.dataset.dismissed === 'true') return;
    if (!homeLaunchTrack.paused) return;
    resumeAudioContext();
    homeLaunchTrack.volume = 0.7;
    homeLaunchTrack.loop = true;
    homeLaunchTrack.muted = false;
    const playback = homeLaunchTrack.play();
    if (playback) {
      playback.catch(() => {
        homeLaunchTrack.pause();
      });
    }
  }

  function stopOpeningTrack() {
    if (!homeLaunchTrack) return;
    try {
      homeLaunchTrack.pause();
      homeLaunchTrack.currentTime = 0;
      homeLaunchTrack.muted = true;
    } catch (error) {}
  }

  function requestOpeningTrack() {
    if (!homeLaunchTrack || !soundEnabled || loading?.dataset.dismissed === 'true') return;
    startOpeningTrack();
  }

  function showHomeAfterLoading() {
    if (!home || !loading || loading.dataset.dismissed === 'true') return;
    loading.dataset.dismissed = 'true';
    loading.style.opacity = '0';
    loading.style.pointerEvents = 'none';

    const revealHome = () => {
      loading.style.display = 'none';
      home.style.display = 'flex';
      home.setAttribute('aria-hidden', 'false');
    };

    loading.addEventListener('transitionend', revealHome, { once: true });
    window.setTimeout(revealHome, 450);
  }

  requestOpeningTrack();
  document.addEventListener('pointerdown', requestOpeningTrack);
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    requestOpeningTrack();
  });

  if (loading && home && launchVerification) {
    launchVerification.addEventListener('click', () => {
      stopOpeningTrack();
      startBackgroundMusic();
      showHomeAfterLoading();
    }, { once: true });
  } else if (home) {
    home.style.display = 'flex';
    home.setAttribute('aria-hidden', 'false');
  }

  function showMenuToast(text){
    const t = document.createElement('div');
    t.textContent = text;
    Object.assign(t.style, {
      position: 'fixed',
      right: '20px',
      bottom: '90px',
      background: 'rgba(0,0,0,0.7)',
      color: '#fff',
      padding: '10px 14px',
      borderRadius: '10px',
      boxShadow: '0 8px 20px rgba(0,0,0,0.6)',
      zIndex: 9999,
      fontWeight: 600,
      transition: 'opacity .4s ease'
    });
    document.body.appendChild(t);
    setTimeout(()=> t.style.opacity = '0', 1800);
    setTimeout(()=> t.remove(), 2200);
  }

  if (submitBtn) {
    submitBtn.addEventListener('click', () => {
      const name = sanitizePlayerName(nameInput?.value);
      if (!name) {
        showMenuToast('Please enter a name');
        if (nameInput) nameInput.focus();
        return;
      }
      if (name.length > 24) {
        showMenuToast('Player names must be 24 characters or fewer.');
        if (nameInput) nameInput.focus();
        return;
      }
      renameActivePlayer(name);
      activePlayerName = name;
      setStoredValue(playerNameKey, name);
      getPlayerRecord();
      savePlayerRecord(getPlayerRecord());
      if (nameDisplay) nameDisplay.textContent = `👤 ${name}`;
      const entry = document.getElementById('name-entry');
      if (entry) entry.style.display = 'none';
      showMenuToast(`Welcome, ${name}`);
    });
  }

  if (changeNameBtn) {
    changeNameBtn.addEventListener('click', () => {
      if (nameInput) nameInput.value = activePlayerName;
      const entry = document.getElementById('name-entry');
      if (entry) entry.style.display = 'flex';
      if (nameInput) {
        nameInput.focus();
        nameInput.select();
      }
    });
  }

  if (nameInput) {
    nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && submitBtn) submitBtn.click();
    });
  }

  function openDifficultyMap(key) {
    const range = difficultyRanges[key];
    if (!range) return;
    showScreen(range.screen);
  }

  if (storyBtn) storyBtn.addEventListener('click', () => showScreen(difficulty));
  
  const diffBack = document.getElementById('difficulty-back');
  if (diffBack) diffBack.addEventListener('click', () => showScreen(home));

  const begBack = document.getElementById('beginner-back');
  if (begBack) begBack.addEventListener('click', () => showScreen(difficulty));

  const proBack = document.getElementById('pro-back');
  if (proBack) proBack.addEventListener('click', () => showScreen(difficulty));

  const expBack = document.getElementById('expert-back');
  if (expBack) expBack.addEventListener('click', () => showScreen(difficulty));

  const begBtn = document.getElementById('beginner-btn');
  const difficultyPhotos = [begBtn, document.getElementById('pro-btn'), document.getElementById('expert-btn')].filter(Boolean);
  difficultyPhotos.forEach((photo) => {
    const option = photo.closest('.difficulty-option');
    const photoCanvas = document.createElement('canvas');
    photoCanvas.className = 'photo-lightning-canvas';
    photoCanvas.setAttribute('aria-hidden', 'true');
    option.appendChild(photoCanvas);
    const photoContext = photoCanvas.getContext('2d');
    let photoLightningFrame = 0;
    const resizePhotoCanvas = () => {
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      photoCanvas.width = Math.max(1, Math.floor(option.clientWidth * pixelRatio));
      photoCanvas.height = Math.max(1, Math.floor(option.clientHeight * pixelRatio));
      photoContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };
    const drawPhotoBolt = () => {
      const width = option.clientWidth;
      const height = option.clientHeight;
      const startX = Math.random() * width;
      const startY = 0;
      const endX = Math.random() * width;
      const endY = height;
      const paths = createLightningPaths(startX, startY, endX, endY, 22, 1 + Math.floor(Math.random() * 2));
      strokeLightning(photoContext, paths, 0.75);
    };
    let photoMicroBoltTimer = 0;
    const drawPhotoMicroBolt = () => {
      const width = option.clientWidth;
      const height = option.clientHeight;
      const centerX = width / 2;
      const direction = Math.random() < 0.5 ? -1 : 1;
      const startX = centerX + (Math.random() - 0.5) * 8;
      const startY = height * (0.12 + Math.random() * 0.75);
      const endX = startX + direction * (Math.random() * 34 + 18);
      const endY = startY + Math.min(height * 0.22, 70);
      const paths = createLightningPaths(startX, startY, endX, endY, 7, 1);
      strokeLightning(photoContext, paths, 0.65, 'warm');
    };
    const animatePhotoMicroBolts = () => {
      if (!difficultyPhotoHovered) return;
      const microBoltChance = Math.random();
      const burstCount = microBoltChance < 0.2 ? 6 : microBoltChance < 0.45 ? 5 : microBoltChance < 0.75 ? 4 : 3;
      for (let i = 0; i < burstCount; i += 1) {
        drawPhotoMicroBolt();
      }
      photoMicroBoltTimer = window.setTimeout(() => {
        animatePhotoMicroBolts();
      }, 25);
    };
    const animatePhotoLightning = () => {
      const width = option.clientWidth;
      const height = option.clientHeight;
      photoContext.clearRect(0, 0, width, height);
      if (Math.random() < 0.5) {
        drawPhotoBolt();
        if (Math.random() < 0.65) drawPhotoBolt();
      }
      photoLightningFrame = window.requestAnimationFrame(animatePhotoLightning);
    };
    const startPhotoHover = () => {
      difficultyPhotoHovered = true;
      if (triggerDifficultyBolt) triggerDifficultyBolt();
      if (!photoLightningFrame) {
        resizePhotoCanvas();
        animatePhotoLightning();
      }
      if (!photoMicroBoltTimer) {
        animatePhotoMicroBolts();
      }
    };
    const endPhotoHover = () => {
      difficultyPhotoHovered = false;
      window.cancelAnimationFrame(photoLightningFrame);
      if (photoMicroBoltTimer) {
        window.clearTimeout(photoMicroBoltTimer);
        photoMicroBoltTimer = 0;
      }
      photoLightningFrame = 0;
      photoContext.clearRect(0, 0, option.clientWidth, option.clientHeight);
    };
    photo.addEventListener('pointerenter', startPhotoHover);
    photo.addEventListener('pointerleave', endPhotoHover);
    photo.addEventListener('focus', startPhotoHover);
    photo.addEventListener('blur', endPhotoHover);
  });
  if (begBtn) begBtn.addEventListener('click', () => openDifficultyMap('beginner'));

  const proBtn = document.getElementById('pro-btn');
  if (proBtn) {
    proBtn.addEventListener('click', () => {
      if (getUnlockedLevelCap() < 11) {
        showMenuToast('Complete Beginner levels 1-10 to unlock Pro.');
        return;
      }
      openDifficultyMap('pro');
    });
  }

  const expBtn = document.getElementById('expert-btn');
  if (expBtn) {
    expBtn.addEventListener('click', () => {
      if (getUnlockedLevelCap() < 21) {
        showMenuToast('Complete Pro levels 11-20 to unlock Expert.');
        return;
      }
      openDifficultyMap('expert');
    });
  }

  [begBtn, proBtn, expBtn].forEach((difficultyImage) => {
    if (!difficultyImage) return;
    difficultyImage.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        difficultyImage.click();
      }
    });
  });

  if (casualBtn) casualBtn.addEventListener('click', () => showScreen(modesScreen));

  const modesBack = document.getElementById('modes-back');
  if (modesBack) modesBack.addEventListener('click', () => showScreen(home));

  const practiceMode = document.getElementById('practice-mode');
  if (practiceMode) {
    practiceMode.addEventListener('click', () => showGame(getUnlockedLevelCap(), 'practice'));
  }

  const rushMode = document.getElementById('rush-mode');
  if (rushMode) {
    rushMode.addEventListener('click', () => {
      const cap = getUnlockedLevelCap();
      showGame(Math.max(1, Math.ceil(Math.random() * cap)), 'rush');
    });
  }

  const endlessMode = document.getElementById('endless-mode');
  if (endlessMode) endlessMode.addEventListener('click', () => showGame(1, 'endless'));

  function returnToLevelMap() {
    saveCurrentPlayerRuntime();
    clearInterval(timerHandle);
    blurActiveElement();
    if (gameShell) {
      gameShell.style.display = 'none';
      gameShell.setAttribute('aria-hidden', 'true');
    }

    const targetDifficulty = level <= 10 ? 'beginner' : level <= 20 ? 'pro' : 'expert';
    const targetScreen = difficultyRanges[targetDifficulty]?.screen || home;
    if (targetScreen) {
      showScreen(targetScreen);
    } else if (home) {
      showScreen(home);
    }
    updateLevelButtonAvailability();
  }

  if (returnLevelMapBtn) {
    returnLevelMapBtn.addEventListener('click', returnToLevelMap);
  }

  if (backHomeBtn) {
    backHomeBtn.addEventListener('click', () => {
      saveCurrentPlayerRuntime();
      clearInterval(timerHandle);
      blurActiveElement();
      if (gameShell) {
        gameShell.style.display = 'none';
        gameShell.setAttribute('aria-hidden', 'true');
      }
      if (home) {
        home.style.display = 'flex';
        home.setAttribute('aria-hidden', 'false');
      }
      updateLevelButtonAvailability();
      if (nameInput) nameInput.focus();
    });
  }

  if (exitBtn) {
    exitBtn.addEventListener('click', () => {
      showMenuToast('Exiting...');
      setTimeout(() => {
        try { window.close(); } catch (e) { /* ignore */ }
      }, 300);
    });
  }

  if (infoBtn) infoBtn.addEventListener('click', () => showScreen(infoScreen));

  if (infoBackBtn) {
    infoBackBtn.addEventListener('click', () => {
      showScreen(home);
      if (infoBtn) infoBtn.focus();
    });
  }

  if (statsBtn) {
    statsBtn.addEventListener('click', () => {
      renderPlayerStats();
      showScreen(statsScreen);
    });
  }

  if (modeStatsOpenBtn) {
    modeStatsOpenBtn.addEventListener('click', () => {
      renderModeStats();
      showScreen(modeStatsScreen);
    });
  }

  if (modeStatsBackBtn) {
    modeStatsBackBtn.addEventListener('click', () => {
      renderPlayerStats();
      showScreen(statsScreen);
    });
  }

  if (statsBackBtn) {
    statsBackBtn.addEventListener('click', () => {
      showScreen(home);
      if (statsBtn) statsBtn.focus();
    });
  }

  function focusHomeScreen() {
    const entry = document.getElementById('name-entry');
    if (entry && entry.style.display !== 'none') {
      if (nameInput) nameInput.focus();
    } else if (home) {
      const firstButton = home.querySelector('button');
      if (firstButton) firstButton.focus();
    }
  }

  document.querySelectorAll('.level-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const maxUnlocked = getUnlockedLevelCap();
      const screenId = btn.closest('.level-screen')?.id || 'beginner-levels';
      const difficultyKey = difficultyByScreen[screenId] || 'beginner';
      const buttonIndex = Number((btn.textContent || '').match(/\d+/)?.[0] || 1);
      const range = difficultyRanges[difficultyKey];
      const levelNumber = range.start + buttonIndex - 1;
      if (levelNumber > maxUnlocked) {
        showMenuToast(`Clear level ${Math.max(1, levelNumber - 1)} first.`);
        return;
      }
      const character = btn.closest('.level-map')?.querySelector('.map-character');
      moveMapCharacter(character, btn);
      window.setTimeout(() => showGame(levelNumber), 700);
    });
  });

  window.addEventListener('resize', positionMapCharacters);
  updateLevelButtonAvailability();

  // Embedded game logic//
  const $ = s => document.querySelector(s);
  const board = $('#board'), wireLayer = $('#wireLayer'), preview = $('#wirePreview');

  function ensurePreviewVisible() {
    if (!preview) return;
    const svg = preview.closest('svg');
    if (svg) {
      svg.style.zIndex = '20';
      svg.style.pointerEvents = 'none';
    }
    preview.style.zIndex = '21';
    preview.style.stroke = '#00f6ff';
    preview.style.strokeWidth = '4';
    preview.style.strokeLinecap = 'round';
    preview.style.strokeLinejoin = 'round';
    preview.style.fill = 'none';
    preview.style.opacity = '0.98';
    preview.style.filter = 'drop-shadow(0 0 7px rgba(69, 217, 255, 0.9))';
  }

  let level = 1, moves = 0, correctMoves = 0, wrongMoves = 0;
  let wires = [], components = [], startTerminal = null, dragging = null, dragOffset = null;
  let completed = false, shorted = false;
  let levelStartedAt = 0, sessionStartedAt = 0, timerHandle = null, sessionRecordedAt = 0;
  let gameMode = 'story', modeDeadline = 0, endlessStreak = 0;
  let modeLevelCeiling = 30;

  const bestKey = 'wirecraft-best';
  const soundPrefKey = 'wirecraft-sound';
  soundEnabled = getStoredValue(soundPrefKey) !== 'off';
  let audioCtx = null;
  const toneTimers = new Set();

  function ensureAudioContext() {
    if (!window.AudioContext && !window.webkitAudioContext) return null;
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContextClass();
    }
    return audioCtx;
  }

  function resumeAudioContext() {
    const ctx = ensureAudioContext();
    if (!ctx || ctx.state !== 'suspended') return;
    ctx.resume().catch(() => {});
  }

  function clearToneTimers() {
    toneTimers.forEach((timerId) => window.clearTimeout(timerId));
    toneTimers.clear();
  }

  function playTone(freq, durationMs, type = 'sine') {
    if (!soundEnabled) return;
    const ctx = ensureAudioContext();
    if (!ctx) return;
    resumeAudioContext();

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.value = 0.0001;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;
      gain.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);
      osc.start(now);
      osc.stop(now + durationMs / 1000);
      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
      };
    } catch (error) {}
  }

  function playConnectSound() { playTone(660, 90); }
  function playWrongMoveSound() { playTone(220, 120, 'square'); }
  function playShortSound() { playTone(120, 320, 'sawtooth'); }
  function playSuccessSound() {
    playTone(523, 120);
    const followUpTimer = window.setTimeout(() => playTone(784, 200), 110);
    toneTimers.add(followUpTimer);
    window.setTimeout(() => toneTimers.delete(followUpTimer), 220);
  }

  function startBackgroundMusic() {
    if (!soundEnabled || !backgroundMusicTrack) return;
    resumeAudioContext();
    if (!backgroundMusicTrack.paused) return;
    backgroundMusicTrack.volume = 0.7;
    backgroundMusicTrack.loop = true;
    backgroundMusicTrack.muted = false;
    backgroundMusicTrack.play().catch(() => {
      backgroundMusicTrack.muted = !soundEnabled;
    });
  }

  function stopBackgroundMusic() {
    if (backgroundMusicTrack) {
      backgroundMusicTrack.pause();
      backgroundMusicTrack.currentTime = 0;
      backgroundMusicTrack.muted = true;
    }
  }

  function saveUnlockedProgress(levelNumber) {
    const current = getUnlockedLevelCap();
    const nextValue = Math.max(current, Math.min(Math.max(levelNumber, 1), 30));
    setStoredValue(progressionKey, String(nextValue));
    const record = getPlayerRecord();
    if (record) {
      record.unlockedLevelCap = nextValue;
      savePlayerRecord(record);
    }
    return nextValue;
  }

  const levels = [
    ['FIRST CIRCUIT', 1, 1, 'SERIES'], ['TWO BULBS', 1, 2, 'SERIES'], ['SWITCH IT', 1, 2, 'SERIES'],
    ['SERIES', 1, 2, 'SERIES'], ['CHOICE', 2, 2, 'PARALLEL'], ['CROSSOVER', 2, 2, 'PARALLEL'],
    ['THREE LOADS', 2, 3, 'SERIES'], ['DETOUR', 2, 2, 'SERIES'], ['REVERSE', 2, 2, 'SERIES'],
    ['DOUBLE SWITCH', 2, 2, 'SERIES'], ['PARALLEL', 2, 3, 'PARALLEL'], ['RED HERRING', 2, 2, 'PARALLEL'],
    ['SPLIT PATH', 2, 3, 'PARALLEL'], ['THREE SWITCHES', 3, 2, 'SERIES'], ['MIXED GRID', 3, 3, 'MIXED'],
    ['LONG ROUTE', 3, 3, 'SERIES'], ['TRIPLE LOAD', 3, 3, 'PARALLEL'], ['DECOY TERMINALS', 3, 3, 'MIXED'],
    ['SERIES + PARALLEL', 3, 4, 'MIXED'], ['LOCKED ROUTE', 4, 3, 'SERIES'], ['FOUR LOADS', 4, 4, 'PARALLEL'],
    ['MAZE', 4, 4, 'MIXED'], ['SWITCH MAZE', 4, 4, 'MIXED'], ['POLARITY', 4, 4, 'MIXED'],
    ['DENSE BOARD', 5, 4, 'PARALLEL'], ['MULTI PATH', 5, 4, 'MIXED'], ['RED HERRING II', 5, 5, 'MIXED'],
    ['COMPLEX LOOP', 5, 5, 'MIXED'], ['MASTER CIRCUIT', 6, 5, 'MIXED'], ['WIRECRAFT MASTER', 7, 6, 'MIXED']
  ];

  function isDecoyComponent(c) {
    return !!c && (c.sub === 'DECOY' || String(c.label || '').includes('DECOY'));
  }

  function resetSwitchPolarities() {
    components.filter(c => c.type === 'switch' && !isDecoyComponent(c)).forEach(c => {
      c.polarity.left = 'neutral';
      c.polarity.right = 'neutral';
    });
  }

  function showToast(t, good = false) {
    const x = $('#toast');
    if (!x) return;
    x.textContent = t;
    x.style.borderColor = good ? '#2c8060' : '#315075';
    x.classList.add('show'); clearTimeout(showToast.t);
    showToast.t = setTimeout(() => x.classList.remove('show'), 1800);
  }

  function setBest() {
    const record = getPlayerRecord();
    const b = record?.bestMovesByLevel && typeof record.bestMovesByLevel === 'object'
      ? record.bestMovesByLevel
      : safeReadJson(getStoredValue(bestKey), {});
    const bestEl = $('#best');
    if (bestEl) bestEl.textContent = Number.isInteger(b?.[level]) ? b[level] : '—';
  }

  function updateLevelProgress(poweredLoads = 0, totalLoads = 1, isComplete = false, isOnTrack = true) {
    const loadCount = Math.max(totalLoads, 1);
    const poweredCount = Math.min(Math.max(poweredLoads, 0), loadCount);
    const progress = isComplete ? 100 : Math.min(99, Math.round((poweredCount / loadCount) * 100));
    const progressTrack = $('#gameProgressTrack');
    const progressBar = $('#gameProgress');
    const progressLabel = $('#gameProgressLabel');
    if (progressTrack) {
      progressTrack.classList.toggle('is-on-track', isOnTrack);
      progressTrack.classList.toggle('is-off-track', !isOnTrack);
      progressTrack.setAttribute('aria-valuemax', '100');
      progressTrack.setAttribute('aria-valuenow', String(progress));
      progressTrack.setAttribute('aria-valuetext', `${poweredCount} of ${loadCount} required loads powered; ${progress}% of current level; topology ${isOnTrack ? 'on track' : 'off track'}`);
    }
    if (progressBar) progressBar.style.width = `${progress}%`;
    if (progressLabel) {
      progressLabel.textContent = isComplete
        ? 'LEVEL COMPLETE · 100%'
        : `${poweredCount} / ${loadCount} LOAD${loadCount === 1 ? '' : 'S'} POWERED · ${progress}%`;
    }
  }

  function buildLevel(n, preserveDeadline = false) {
    level = n; moves = 0; correctMoves = 0; wrongMoves = 0; wires = [];
    completed = false; shorted = false; startTerminal = null;
    levelStartedAt = Date.now();
    if (!preserveDeadline) {
      modeDeadline = gameMode === 'rush' ? levelStartedAt + (45 * 1000) : 0;
    }
    clearInterval(timerHandle);
    timerHandle = setInterval(updateRuntimeDisplay, 1000);

    if (gameMode === 'story') {
      const maxUnlocked = getUnlockedLevelCap();
      if (n > maxUnlocked) {
        level = Math.min(Math.max(maxUnlocked, 1), 30);
        n = level;
      }
    } else {
      level = Math.min(Math.max(n, 1), 30);
      n = level;
    }

    const [name, s, b, mode] = levels[n - 1];
    const lvlNo = $('#levelNo'); if (lvlNo) lvlNo.textContent = n;
    const lvlName = $('#levelName'); if (lvlName) lvlName.textContent = `LEVEL ${n} — ${name}`;
    const modeLabels = { story: 'STORY MODE', practice: 'PRACTICE LAB', rush: 'POWER RUSH', endless: 'ENDLESS GRID' };
    const modeRead = $('#modeReadout'); if (modeRead) modeRead.textContent = modeLabels[gameMode] || modeLabels.story;
    const streakEl = $('#streak'); if (streakEl) streakEl.textContent = gameMode === 'endless' ? endlessStreak : '—';

    const mEl = $('#moves'); if (mEl) mEl.textContent = 0;
    const cmEl = $('#correctMoves'); if (cmEl) cmEl.textContent = 0;
    const wmEl = $('#wrongMoves'); if (wmEl) wmEl.textContent = 0;
    const prg = $('#progress'); if (prg) prg.style.width = '0%';
    updateRuntimeDisplay(); setBest();

    components = [];
    const W = board ? board.clientWidth : 800, H = board ? board.clientHeight : 600;
    const usableW = Math.max(600, W - 330), left = 35, top = 115;
    const total = 1 + s + b + Math.floor((n - 1) / 3);
    const cols = Math.min(5, Math.max(3, Math.ceil(Math.sqrt(total + 1))));
    const rows = Math.ceil(total / cols), positions = [];
    const shuffle = items => {
      for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
      }
      return items;
    };
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++)
      positions.push([left + c * (usableW / cols), top + r * (Math.max(100, (H - 150) / Math.max(1, rows)))]);
    shuffle(positions);
    let pi = 0;
    const add = (type, label, sub, terms = 2) => {
      const p = positions[pi++ % positions.length];
      const x = Math.min(p[0], W - 190), y = Math.min(p[1], H - 115);
      components.push({
        id: type + '_' + components.length, type, label, sub, x, y, terms,
        closed: type === 'switch',
        polarity: { left: 'neutral', right: 'neutral' }
      });
    };
    add('source', 'POWER SOURCE', '12V DC', 2);
    for (let i = 0; i < s; i++) add('switch', `SWITCH ${i + 1}`, i % 2 ? 'SPST' : 'CONTROL', 2);
    for (let i = 0; i < b; i++) add('bulb', `BULB ${i + 1}`, 'LOAD', 2);

    const decoys = Math.floor((n - 1) / 3);
    for (let i = 0; i < decoys; i++)
      add(i % 2 ? 'switch' : 'bulb', i % 2 ? 'DECOY SWITCH' : 'BROKEN BULB', 'DECOY', 2);

    shuffle(components);
    render();
    updateLevelProgress(0, b);
    const obj = $('#objective');
    if (obj) {
      obj.textContent = mode === 'SERIES'
        ? `Use exactly ${b} bulb${b > 1 ? 's' : ''} and ${s} switch${s > 1 ? 'es' : ''}. Build a SERIES circuit: one continuous current path with no parallel branches.`
        : mode === 'PARALLEL'
        ? `Use exactly ${b} bulb${b > 1 ? 's' : ''} and ${s} switch${s > 1 ? 'es' : ''}. Build a PARALLEL circuit: place the loads on separate branches between the same two electrical nodes.`
        : `Use exactly ${b} bulb${b > 1 ? 's' : ''} and ${s} switch${s > 1 ? 'es' : ''}. Build a MIXED circuit: combine a series section with a genuine parallel branch while respecting + / − polarity.`;
    }
    const hnt = $('#hint');
    if (hnt) {
      hnt.textContent = mode === 'SERIES'
        ? `SERIES RULE: use exactly ${b} bulb${b > 1 ? 's' : ''} and ${s} switch${s > 1 ? 'es' : ''}. Current enters each bulb at (+) and leaves at (−). Connect the source (+) through the closed switch${s > 1 ? 'es' : ''}, then each bulb from (+) to (−), and return to source (−). No branches or bypasses.`
        : `Use exactly ${b} bulb${b > 1 ? 's' : ''} and ${s} switch${s > 1 ? 'es' : ''}. Green switch terminals are NEUTRAL. The first polarized connection determines a neutral terminal’s polarity. Never short + to −.`;
    }
    updateStatus();
    requestVerifiedChallenge(gameMode, level);
  }

  function render() {
    if (!board) return;
    board.querySelectorAll('.component').forEach(e => e.remove());
    components.forEach(c => {
      const e = document.createElement('div');
      e.className = `component ${c.type}`;
      e.id = c.id; e.style.left = c.x + 'px'; e.style.top = c.y + 'px';

      if (c.type === 'source') {
        e.innerHTML = `
          <div class="source-model" aria-hidden="true">
            <div class="source-cap"></div>
            <div class="source-body">
              <span class="source-mark positive">+</span>
              <span class="source-voltage">12V</span>
              <span class="source-mark negative">−</span>
            </div>
            <div class="source-foot"></div>
          </div>
          <div class="label">${c.label}</div><div class="sub">${c.sub}</div>
        `;
      } else if (c.type === 'bulb') {
        e.innerHTML = `
          <div class="bulb-model" aria-hidden="true">
            <div class="bulb-glass"><div class="bulb-filament"></div></div>
            <div class="bulb-socket"></div>
          </div>
          <div class="label">${c.label}</div><div class="sub">${c.sub}</div>
        `;
      } else {
        e.innerHTML = `
          <div class="switch-plate">
            <div class="switch-header">${c.label}</div>
            <div class="switch-body">
              <div class="switch-base">
                <div class="switch-lever"></div>
              </div>
              <div class="switch-meta">
                <span class="switch-state">${c.closed ? 'ON' : 'OFF'}</span>
                <span class="switch-sub">${c.sub}</span>
              </div>
            </div>
          </div>
        `;
      }

      if (c.type === 'source') {
        e.appendChild(term(c.id, 'left', 'neg'));
        e.appendChild(term(c.id, 'right', 'pos'));
      } else {
        e.appendChild(term(c.id, 'left', c.type === 'switch' ? 'neutral' : 'pos'));
        e.appendChild(term(c.id, 'right', c.type === 'switch' ? 'neutral' : 'neg'));
      }

      e.addEventListener('pointerdown', componentPointerDown);
      if (c.type === 'switch') {
        e.classList.toggle('on', c.closed);
        if (isDecoyComponent(c)) {
          e.title = 'Defective decoy switch — does not conduct';
          const state = e.querySelector('.switch-state'); if (state) state.textContent = 'FAULT';
          e.classList.add('decoy');
        } else {
          e.title = 'Double-click to toggle ON/OFF';
          e.addEventListener('dblclick', () => {
            c.closed = !c.closed;
            e.classList.toggle('on', c.closed);
            const state = e.querySelector('.switch-state'); if (state) state.textContent = c.closed ? 'ON' : 'OFF';
            updateStatus(); updatePower();
          });
        }
      }
      board.appendChild(e);
    });
    drawWires();
  }

  function term(cid, side, polarity) {
    const t = document.createElement('div');
    t.className = `terminal ${side} ${polarity === 'pos' ? 'pos' : polarity === 'neg' ? 'neg' : 'neutral'}`;
    t.dataset.cid = cid; t.dataset.side = side; t.dataset.polarityCode = polarity;
    t.dataset.polarity = polarity === 'pos' ? '+' : polarity === 'neg' ? '−' : 'N';
    t.title = polarity === 'neutral' ? 'NEUTRAL — adopts polarity from its first polarized connection' : polarity === 'pos' ? 'POSITIVE (+)' : 'NEGATIVE (−)';
    t.addEventListener('pointerdown', terminalDown);
    t.addEventListener('pointerup', terminalUp);
    return t;
  }

  function componentPointerDown(ev) {
    if (ev.target.classList.contains('terminal')) return;
    const e = ev.currentTarget, c = components.find(x => x.id === e.id);
    dragging = c;
    const r = board.getBoundingClientRect();
    dragOffset = { x: ev.clientX - r.left - c.x, y: ev.clientY - r.top - c.y };
    e.setPointerCapture(ev.pointerId);
    e.addEventListener('pointermove', componentMove);
    e.addEventListener('pointerup', (eUp) => componentUp(eUp, e), { once: true });
  }

  function componentMove(ev) {
    if (!dragging || !board) return;
    const r = board.getBoundingClientRect();
    dragging.x = Math.max(5, Math.min(board.clientWidth - 145, ev.clientX - r.left - dragOffset.x));
    dragging.y = Math.max(75, Math.min(board.clientHeight - 105, ev.clientY - r.top - dragOffset.y));
    const e = $('#' + dragging.id);
    if (e) {
      e.style.left = dragging.x + 'px'; e.style.top = dragging.y + 'px';
    }
    drawWires();
  }

  function componentUp(ev, targetElement) {
    if (targetElement && ev.pointerId !== undefined) {
      try { targetElement.releasePointerCapture(ev.pointerId); } catch(err){}
    }
    dragging = null;
  }

  function terminalCenter(cid, side) {
    const e = $('#' + cid);
    if (!e || !board) return { x: 0, y: 0 };
    const t = e.querySelector('.terminal.' + side);
    if (!t) return { x: 0, y: 0 };
    const r = t.getBoundingClientRect();
    return wirePointFromClient(r.left + r.width / 2, r.top + r.height / 2);
  }

  function wirePointFromClient(clientX, clientY) {
    const svg = wireLayer?.ownerSVGElement;
    const transform = svg?.getScreenCTM();
    if (!svg || !transform) {
      const bounds = board.getBoundingClientRect();
      return { x: clientX - bounds.left, y: clientY - bounds.top };
    }
    const point = svg.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    return point.matrixTransform(transform.inverse());
  }

  function key(cid, side) { return cid + '|' + side; }
  function splitKey(k) { const i = k.lastIndexOf('|'); return [k.slice(0, i), k.slice(i + 1)]; }
  function getTerm(k) {
    const [cid, side] = splitKey(k);
    return { cid, side, el: $('#' + cid)?.querySelector('.terminal.' + side) };
  }
  function exists(a, b) { return wires.some(w => (w.a === a && w.b === b) || (w.a === b && w.b === a)); }

  function terminalDown(ev) {
    ev.stopPropagation();
    startTerminal = { cid: ev.currentTarget.dataset.cid, side: ev.currentTarget.dataset.side };
    ensurePreviewVisible();
    const p = terminalCenter(startTerminal.cid, startTerminal.side);
    if (preview) preview.setAttribute('d', `M ${p.x} ${p.y} L ${p.x} ${p.y}`);
    window.addEventListener('pointermove', previewMove);
  }

  function previewMove(ev) {
    if (!startTerminal || !board || !preview) return;
    const p = terminalCenter(startTerminal.cid, startTerminal.side);
    const pointer = wirePointFromClient(ev.clientX, ev.clientY);
    preview.setAttribute('d', `M ${p.x} ${p.y} L ${pointer.x} ${pointer.y}`);
  }

  function terminalUp(ev) {
    ev.stopPropagation();
    window.removeEventListener('pointermove', previewMove);
    if (preview) preview.setAttribute('d', '');
    if (!startTerminal) return;

    const end = { cid: ev.currentTarget.dataset.cid, side: ev.currentTarget.dataset.side };
    moves++;
    updateMoveDisplay();
    const startComp = components.find(c => c.id === startTerminal.cid);
    const endComp = components.find(c => c.id === end.cid);
    if (isDecoyComponent(startComp) || isDecoyComponent(endComp)) {
      wrongMoves++; updateMoveDisplay();
      playWrongMoveSound();
      showToast('Defective decoy component — it cannot be used in the circuit.');
      startTerminal = null;
      return;
    }

    if (key(startTerminal.cid, startTerminal.side) !== key(end.cid, end.side) &&
       !exists(key(startTerminal.cid, startTerminal.side), key(end.cid, end.side))) {
      const a = key(startTerminal.cid, startTerminal.side), b = key(end.cid, end.side);
      wires.push({ a, b });

      learnSwitchPolarity(a, b);
      learnSwitchPolarity(b, a);

      if (hasConductorShort()) {
        wrongMoves++; updateMoveDisplay();
        shortCircuit();
        startTerminal = null; return;
      }

      correctMoves++; updateMoveDisplay();
      playConnectSound();
      drawWires(); updateStatus(); updatePower();
    } else {
      wrongMoves++; updateMoveDisplay();
      playWrongMoveSound();
    }
    startTerminal = null;
  }

  function formatDuration(seconds) {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  }

  function updateMoveDisplay() {
    const m = $('#moves'); if (m) m.textContent = moves;
    const cm = $('#correctMoves'); if (cm) cm.textContent = correctMoves;
    const wm = $('#wrongMoves'); if (wm) wm.textContent = wrongMoves;
  }

  function updateRuntimeDisplay() {
    if (!levelStartedAt) return;
    const levelSeconds = Math.floor((Date.now() - levelStartedAt) / 1000);
    const sessionSeconds = sessionStartedAt ? Math.floor((Date.now() - sessionStartedAt) / 1000) : levelSeconds;
    const lt = $('#levelTime'); if (lt) lt.textContent = formatDuration(levelSeconds);
    const rt = $('#runtime'); if (rt) rt.textContent = formatDuration(sessionSeconds);
    updateModeReserve();
  }

  function updateModeReserve() {
    const reserve = $('#powerReserve'), pill = $('#reservePill');
    if (!reserve || !pill) return;
    if (gameMode !== 'rush') {
      reserve.textContent = gameMode === 'endless' ? '∞' : '—';
      pill.classList.remove('critical');
      return;
    }
    const seconds = Math.max(0, Math.ceil((modeDeadline - Date.now()) / 1000));
    reserve.textContent = formatDuration(seconds);
    pill.classList.toggle('critical', seconds <= 15);
    if (seconds === 0 && !completed && !shorted) endRun('Power reserve depleted. The grid went dark.');
  }

  function endRun(message) {
    if (completed) return;
    completed = true;
    const record = getPlayerRecord();
    if (record && gameMode !== 'story') {
      ensureModeStats(record)[gameMode].failedRuns++;
      savePlayerRecord(record);
    }
    clearInterval(timerHandle);
    playShortSound();
    const mIcon = $('#modalIcon'); if (mIcon) mIcon.textContent = '⚠️';
    const mTitle = $('#modalTitle'); if (mTitle) mTitle.textContent = 'RUN ENDED';
    const mText = $('#modalText'); if (mText) mText.textContent = message;
    const mStats = $('#modalStats'); if (mStats) mStats.textContent = gameMode === 'endless' ? `Final streak: ${endlessStreak} circuit${endlessStreak === 1 ? '' : 's'}.` : 'Try a cleaner route or switch to Practice Lab to test an idea.';
    const nxt = $('#next'); if (nxt) nxt.textContent = gameMode === 'endless' ? 'START NEW RUN' : 'TRY AGAIN';
    const mdl = $('#modal'); if (mdl) mdl.classList.add('show');
  }

  function saveCurrentPlayerRuntime() {
    const record = getPlayerRecord();
    if (!record || !sessionStartedAt) return;
    const elapsedSeconds = Math.max(0, Math.floor((Date.now() - sessionStartedAt) / 1000));
    const secondsSinceLastSave = Math.max(0, elapsedSeconds - sessionRecordedAt);
    if (!secondsSinceLastSave) return;
    record.runtimeSeconds += secondsSinceLastSave;
    sessionRecordedAt = elapsedSeconds;
    savePlayerRecord(record);
  }

  function recordPlayerLevel() {
    const record = getPlayerRecord();
    if (!record) return;
    const levelClearTime = Math.floor((Date.now() - levelStartedAt) / 1000);
    if (gameMode === 'story') record.profile.lastLevel = level;
    record.levelsCleared++;
    record.totalMoves += moves;
    record.correctMoves += correctMoves;
    record.wrongMoves += wrongMoves;
    record.bestClearTimeSeconds = record.bestClearTimeSeconds === null
      ? levelClearTime
      : Math.min(record.bestClearTimeSeconds, levelClearTime);
    record.levels[level] = {
      clearTimeSeconds: levelClearTime,
      moves,
      correctMoves,
      wrongMoves,
      clearedAt: new Date().toISOString()
    };
    record.bestMovesByLevel = record.bestMovesByLevel || {};
    record.bestMovesByLevel[level] = record.bestMovesByLevel[level]
      ? Math.min(record.bestMovesByLevel[level], moves)
      : moves;
    setStoredValue(bestKey, JSON.stringify(record.bestMovesByLevel));
    if (gameMode !== 'story') {
      const stat = ensureModeStats(record)[gameMode];
      stat.circuitsCleared++;
      stat.bestTimeSeconds = stat.bestTimeSeconds === null ? levelClearTime : Math.min(stat.bestTimeSeconds, levelClearTime);
      stat.bestMoves = stat.bestMoves === null ? moves : Math.min(stat.bestMoves, moves);
      if (gameMode === 'endless') stat.bestStreak = Math.max(stat.bestStreak, endlessStreak + 1);
    }
    savePlayerRecord(record);
  }

  function learnSwitchPolarity(switchKey, otherKey) {
    const [cid, side] = splitKey(switchKey);
    const sw = components.find(c => c.id === cid);
    if (!sw || sw.type !== 'switch' || isDecoyComponent(sw)) return;
    if (sw.polarity[side] !== 'neutral') return;
    const p = terminalPolarity(otherKey);
    if (p !== 'neutral') sw.polarity[side] = p;
  }

  function buildConductorGraph() {
    const g = new Map();
    const add = (a, b) => { if (!g.has(a)) g.set(a, []); g.get(a).push(b); };
    wires.forEach(w => { add(w.a, w.b); add(w.b, w.a); });
    components.filter(c => !isDecoyComponent(c) && c.type === 'switch' && c.closed).forEach(c => {
      add(key(c.id, 'left'), key(c.id, 'right'));
      add(key(c.id, 'right'), key(c.id, 'left'));
    });
    return g;
  }

  function hasConductorShort() {
    const src = components.find(c => c.type === 'source');
    if (!src) return false;
    const g = buildConductorGraph();
    return reachable(g, key(src.id, 'right'), key(src.id, 'left'));
  }

  function fixedPolarity(k) {
    const { cid, side } = getTerm(k), c = components.find(x => x.id === cid);
    if (!c) return 'neutral';
    if (c.type === 'source') return side === 'right' ? 'pos' : 'neg';
    if (c.type === 'bulb') return side === 'left' ? 'pos' : 'neg';
    return 'neutral';
  }

  function terminalPolarity(k) {
    const { cid, side } = splitKey(k), c = components.find(x => x.id === cid);
    if (!c || isDecoyComponent(c)) return 'neutral';
    if (c.type === 'switch') return c.polarity[side] || 'neutral';
    return fixedPolarity(k);
  }

  function electricalGraph() {
    const g = new Map();
    const add = (a, b, meta = {}) => {
      if (!g.has(a)) g.set(a, []);
      g.get(a).push({ to: b, ...meta });
    };
    wires.forEach(w => { add(w.a, w.b, { wire: true }); add(w.b, w.a, { wire: true }); });
    components.forEach(c => {
      if (isDecoyComponent(c)) return;
      if (c.type === 'bulb') {
        add(key(c.id, 'left'), key(c.id, 'right'), { component: c, load: true });
      } else if (c.type === 'switch' && c.closed) {
        add(key(c.id, 'left'), key(c.id, 'right'), { component: c, switch: true });
        add(key(c.id, 'right'), key(c.id, 'left'), { component: c, switch: true });
      }
    });
    return g;
  }

  function reachable(g, start, target) {
    const q = [start], seen = new Set([start]);
    while (q.length) {
      const x = q.shift();
      if (x === target) return true;
      (g.get(x) || []).forEach(e => {
        if (!seen.has(e.to)) { seen.add(e.to); q.push(e.to); }
      });
    }
    return false;
  }

  function unionFind() {
    const parent = new Map();
    const find = x => {
      if (!parent.has(x)) parent.set(x, x);
      let p = parent.get(x);
      if (p !== x) { p = find(p); parent.set(x, p); }
      return p;
    };
    const union = (a, b) => {
      const ra = find(a), rb = find(b);
      if (ra !== rb) parent.set(ra, rb);
    };
    return { parent, find, union };
  }

  function circuitNets() {
    const uf = unionFind();
    const allKeys = [];
    components.forEach(c => {
      ['left', 'right'].forEach(side => allKeys.push(key(c.id, side)));
    });
    allKeys.forEach(k => uf.find(k));
    wires.forEach(w => uf.union(w.a, w.b));

    const netOf = k => uf.find(k);
    const source = components.find(c => c.type === 'source');
    const edges = [];

    components.forEach(c => {
      if (c.type === 'source' || isDecoyComponent(c)) return;
      if (c.type === 'switch' && !c.closed) return;

      const u = netOf(key(c.id, 'left'));
      const v = netOf(key(c.id, 'right'));
      edges.push({ c, u, v, self: u === v });
    });

    return { uf, netOf, edges, source };
  }

  function topologyData() {
    const circuit = circuitNets();
    const { netOf, edges, source } = circuit;
    if (!source) return { valid: false, type: 'INVALID', lit: [], nets: {}, edges: [], netOf };

    const sourcePlus = key(source.id, 'right');
    const sourceMinus = key(source.id, 'left');
    const g = electricalGraph();

    if (hasConductorShort()) {
      return { valid: false, type: 'SHORT', lit: [], nets: { plus: sourcePlus, minus: sourceMinus }, edges, netOf };
    }

    const closed = reachable(g, sourcePlus, sourceMinus);
    const bulbs = components.filter(c => c.type === 'bulb' && c.sub !== 'DECOY');
    const lit = bulbs.filter(b => {
      const left = key(b.id, 'left');
      const right = key(b.id, 'right');
      return reachable(g, sourcePlus, left) && reachable(g, right, sourceMinus);
    });

    if (!closed) {
      return { valid: true, type: 'OPEN', lit, nets: { plus: sourcePlus, minus: sourceMinus }, edges, netOf };
    }

    const plus = netOf(sourcePlus);
    const minus = netOf(sourceMinus);
    if (plus === minus) return { valid: false, type: 'SHORT', lit, nets: { plus, minus }, edges, netOf };

    const pairMap = new Map(), degree = new Map();
    edges.forEach(e => {
      if (e.self) return;
      const pair = [e.u, e.v].sort().join('::');
      if (!pairMap.has(pair)) pairMap.set(pair, []);
      pairMap.get(pair).push(e.c);
      degree.set(e.u, (degree.get(e.u) || 0) + 1);
      degree.set(e.v, (degree.get(e.v) || 0) + 1);
    });

    const adjacency = new Map();
    edges.forEach(e => {
      if (e.self) return;
      if (!adjacency.has(e.u)) adjacency.set(e.u, []);
      if (!adjacency.has(e.v)) adjacency.set(e.v, []);
      adjacency.get(e.u).push(e.v);
      adjacency.get(e.v).push(e.u);
    });

    let pathCount = 0;
    const maxPathsAllowed = 50;
    const walk = (node, target, seen) => {
      if (pathCount >= maxPathsAllowed) return;
      if (node === target) {
        pathCount += 1;
        return;
      }
      for (const next of adjacency.get(node) || []) {
        if (seen.has(next)) continue;
        seen.add(next);
        walk(next, target, seen);
        seen.delete(next);
      }
    };
    walk(plus, minus, new Set([plus]));

    const parallelSection = pathCount > 1 || [...pairMap.values()].some(arr => arr.length >= 2);
    let junction = false;
    for (const [net, d] of degree) {
      if (net !== plus && net !== minus && d > 2) { junction = true; break; }
    }

    let type;
    if (parallelSection && junction) type = 'MIXED';
    else if (parallelSection) type = 'PARALLEL';
    else if (junction) type = 'MIXED';
    else type = 'SERIES';

    return { valid: true, type, lit, nets: { plus, minus }, edges, parallelSection, junction, netOf };
  }

  function classifyCircuit() {
    return topologyData().type;
  }

  function seriesConnectionsAreCorrect() {
    const bulbs = components.filter(c => c.type === 'bulb' && c.sub !== 'DECOY');
    const src = components.find(c => c.type === 'source');
    if (!src || !bulbs.length) return false;

    const topo = topologyData();
    if (topo.type !== 'SERIES') return false;

    for (const w of wires) {
      const A = getTerm(w.a), B = getTerm(w.b);
      const ca = components.find(c => c.id === A.cid);
      const cb = components.find(c => c.id === B.cid);
      if (ca?.type === 'bulb' && cb?.type === 'bulb') {
        const pa = fixedPolarity(w.a), pb = fixedPolarity(w.b);
        if (!((pa === 'neg' && pb === 'pos') || (pa === 'pos' && pb === 'neg'))) return false;
      }
    }

    const adjacency = new Map();
    const add = (u, v, c) => {
      if (!adjacency.has(u)) adjacency.set(u, []);
      adjacency.get(u).push({ net: v, c });
    };
    topo.edges.forEach(e => {
      if (e.self) return;
      add(e.u, e.v, e.c); add(e.v, e.u, e.c);
    });

    const plus = topo.nets.plus, minus = topo.nets.minus;
    let current = plus;
    const used = new Set(), visitedBulbs = new Set();
    let guard = 0;

    while (current !== minus && guard++ < topo.edges.length + 2) {
      const options = (adjacency.get(current) || []).filter(x => !used.has(x.c.id));
      if (options.length !== 1) return false;

      const step = options[0], c = step.c;
      used.add(c.id);

      const leftNet = topo.netOf(key(c.id, 'left'));
      const rightNet = topo.netOf(key(c.id, 'right'));
      const next = step.net;

      if (c.type === 'bulb') {
        if (current !== leftNet || next !== rightNet) return false;
        visitedBulbs.add(c.id);
      } else if (c.type === 'switch') {
        if (!((current === leftNet && next === rightNet) || (current === rightNet && next === leftNet))) return false;
      }

      current = next;
    }

    if (current !== minus) return false;
    if (visitedBulbs.size !== bulbs.length) return false;

    for (const b of bulbs) {
      if (topo.netOf(key(b.id, 'left')) === topo.netOf(key(b.id, 'right'))) return false;
    }

    return true;
  }

  function componentIsOnCircuitPath(component, topology) {
    if (!component.closed) return false;
    const adjacency = new Map();
    topology.edges.forEach(edge => {
      if (edge.self) return;
      if (!adjacency.has(edge.u)) adjacency.set(edge.u, []);
      if (!adjacency.has(edge.v)) adjacency.set(edge.v, []);
      adjacency.get(edge.u).push({ node: edge.v, componentId: edge.c.id });
      adjacency.get(edge.v).push({ node: edge.u, componentId: edge.c.id });
    });

    const start = topology.nets.plus;
    const target = topology.nets.minus;
    if (!start || !target) return false;
    const visit = (node, usedComponent, seen) => {
      if (node === target) return usedComponent;
      for (const edge of adjacency.get(node) || []) {
        if (seen.has(edge.node)) continue;
        seen.add(edge.node);
        const found = visit(
          edge.node,
          usedComponent || edge.componentId === component.id,
          seen
        );
        seen.delete(edge.node);
        if (found) return true;
      }
      return false;
    };
    return visit(start, false, new Set([start]));
  }

  function levelTopologyAccepted(actual, target, topology = topologyData()) {
    if (target === 'SERIES') {
      return actual === 'SERIES' && seriesConnectionsAreCorrect();
    }
    if (target !== 'PARALLEL' && target !== 'MIXED') return false;
    if (actual !== target) return false;

    const realSwitches = components.filter(c => c.type === 'switch' && !isDecoyComponent(c));
    const realBulbs = components.filter(c => c.type === 'bulb' && !isDecoyComponent(c));
    if (realSwitches.length === 0 || realBulbs.length === 0) return false;

    const componentIsWired = component => wires.some(wire => {
      const [aCid] = splitKey(wire.a);
      const [bCid] = splitKey(wire.b);
      return aCid === component.id || bCid === component.id;
    });
    return realSwitches.every(component => (
      componentIsWired(component) && componentIsOnCircuitPath(component, topology)
    )) && realBulbs.every(componentIsWired);
  }

  function updateStatus() {
    if (shorted) return;
    const neutral = components.filter(c => c.type === 'switch')
      .flatMap(c => ['left', 'right'].map(s => c.polarity[s] === 'neutral' ? 1 : 0))
      .reduce((a, b) => a + b, 0);

    const data = topologyData();
    const mode = data.type;
    const topo = $('#topology'); if (topo) topo.innerHTML = `TOPOLOGY: <b>${mode}</b>`;
    const stEl = $('#status');
    if (!stEl) return;

    if (neutral) {
      stEl.textContent = `${neutral} switch terminal${neutral > 1 ? 's' : ''} still neutral. Green terminals adopt + or − from the connected electrical net.`;
    } else if (mode === 'SHORT') {
      stEl.textContent = 'SHORT CIRCUIT! The positive and negative supply nets have been joined.';
    } else if (mode === 'OPEN') {
      const openSwitches = components.filter(c => c.type === 'switch' && !isDecoyComponent(c) && !c.closed).length;
      stEl.textContent = openSwitches
        ? `Circuit is OPEN because ${openSwitches} switch${openSwitches > 1 ? 'es are' : ' is'} OFF. Double-click the switch${openSwitches > 1 ? 'es' : ''} to close ${openSwitches > 1 ? 'them' : 'it'}.`
        : 'Circuit is OPEN. There is no complete conducting path from + back to −.';
    } else if (mode === 'SERIES') {
      stEl.textContent = 'SERIES CIRCUIT: one current path. Every load is in the same chain, so opening one series switch stops the chain.';
    } else if (mode === 'PARALLEL') {
      stEl.textContent = 'PARALLEL CIRCUIT: multiple branches exist between the same electrical nodes. Each branch has its own current path.';
    } else if (mode === 'MIXED') {
      stEl.textContent = 'MIXED CIRCUIT: series sections feed a branching parallel section. Junctions and independent branches are being recognized.';
    } else {
      stEl.textContent = 'Connect source + to the load network and return to source −. Use green switch terminals on either polarity.';
    }
  }

  function drawWires() {
    if (!wireLayer) return;
    wireLayer.innerHTML = '';

    wires.forEach(w => {
      const [ac, as] = splitKey(w.a), [bc, bs] = splitKey(w.b);
      const a = terminalCenter(ac, as), b = terminalCenter(bc, bs);
      const pa = terminalPolarity(w.a), pb = terminalPolarity(w.b);
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      let cls = 'wire';
      if (pa === 'pos' && pb === 'pos') cls += ' pos';
      else if (pa === 'neg' && pb === 'neg') cls += ' neg';
      else if (pa === 'neutral' || pb === 'neutral') cls += ' neutral';
      else cls += ' neutral';
      path.classList.add(...cls.split(' '));
      path.dataset.a = w.a; path.dataset.b = w.b;
      const mid = (a.x + b.x) / 2;
      let d = `M ${a.x} ${a.y} C ${mid} ${a.y}, ${mid} ${b.y}, ${b.x} ${b.y}`;
      const blockedComponents = [...board.querySelectorAll('.component')]
        .filter(component => component.id !== ac && component.id !== bc)
        .map(component => {
          const bounds = component.getBoundingClientRect();
          const topLeft = wirePointFromClient(bounds.left, bounds.top);
          const bottomRight = wirePointFromClient(bounds.right, bounds.bottom);
          return {
            left: topLeft.x - 7,
            right: bottomRight.x + 7,
            top: topLeft.y - 7,
            bottom: bottomRight.y + 7
          };
        });
      const cubicPoint = (start, controlA, controlB, end, t) => {
        const inverse = 1 - t;
        return {
          x: inverse ** 3 * start.x + 3 * inverse ** 2 * t * controlA.x + 3 * inverse * t ** 2 * controlB.x + t ** 3 * end.x,
          y: inverse ** 3 * start.y + 3 * inverse ** 2 * t * controlA.y + 3 * inverse * t ** 2 * controlB.y + t ** 3 * end.y
        };
      };
      const crossesComponent = (start, controlA, controlB, end) => {
        for (let step = 0; step <= 32; step += 1) {
          const point = cubicPoint(start, controlA, controlB, end, step / 32);
          if (blockedComponents.some(bounds => point.x >= bounds.left && point.x <= bounds.right && point.y >= bounds.top && point.y <= bounds.bottom)) return true;
        }
        return false;
      };
      const start = { x: a.x, y: a.y }, end = { x: b.x, y: b.y };
      if (crossesComponent(start, { x: mid, y: a.y }, { x: mid, y: b.y }, end)) {
        const startOut = { x: a.x + (as === 'left' ? -16 : 16), y: a.y };
        const endOut = { x: b.x + (bs === 'left' ? -16 : 16), y: b.y };
        const routeX = (startOut.x + endOut.x) / 2;
        const detourDistance = Math.max(24, Math.abs(b.x - a.x) * 0.25);
        const routeTop = Math.max(0, Math.min(...blockedComponents.map(bounds => bounds.top)) - detourDistance);
        const routeBottom = Math.min(board.clientHeight, Math.max(...blockedComponents.map(bounds => bounds.bottom)) + detourDistance);
        const routeYs = [routeTop, routeBottom].sort((left, right) =>
          Math.abs(left - (a.y + b.y) / 2) - Math.abs(right - (a.y + b.y) / 2)
        );
        for (const routeY of routeYs) {
          const controlA = { x: routeX, y: routeY };
          const controlB = { x: routeX, y: routeY };
          if (crossesComponent(startOut, controlA, controlB, endOut)) continue;
          d = `M ${a.x} ${a.y} L ${startOut.x} ${startOut.y} C ${controlA.x} ${controlA.y}, ${controlB.x} ${controlB.y}, ${endOut.x} ${endOut.y} L ${b.x} ${b.y}`;
          break;
        }
      }
      path.setAttribute('d', d);
      const outline = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      outline.setAttribute('d', d);
      outline.setAttribute('class', 'wire-outline');
      outline.setAttribute('aria-hidden', 'true');
      wireLayer.appendChild(outline);
      wireLayer.appendChild(path);
    });
  }

  function shortCircuit() {
    shorted = true;
    playShortSound();
    const requiredLoads = components.filter(c => c.type === 'bulb' && c.sub !== 'DECOY').length;
    updateLevelProgress(0, requiredLoads, false, false);
    const prg = $('#progress'); if (prg) prg.style.width = '0%';
    const stEl = $('#status');
    if (stEl) stEl.textContent = 'SHORT CIRCUIT! A conductor connected the positive and negative sides. The circuit has failed.';
    document.querySelectorAll('.component.bulb').forEach(e => { e.classList.remove('on'); e.classList.add('broken'); });
    document.querySelectorAll('.wire').forEach(e => e.classList.add('bad'));
    showToast('💥 POLARITY SHORT — CIRCUIT FAILED');
    if (gameMode === 'endless') {
      setTimeout(() => endRun('A polarity short collapsed the Endless Grid.'), 500);
      return;
    }
    setTimeout(() => {
      wires = []; shorted = false; resetSwitchPolarities(); render();
      updateLevelProgress(0, requiredLoads);
      if (stEl) stEl.textContent = 'Circuit reset after the short circuit. Green switch terminals can be used on either side of the supply.';
    }, 900);
  }

  function updatePower() {
    if (shorted) return;

    const data = topologyData();
    const bulbs = components.filter(c => c.type === 'bulb' && c.sub !== 'DECOY');
    const lit = data.lit || [];

    if (data.type === 'SHORT') {
      shortCircuit(); return;
    }

    bulbs.forEach(b => {
      const el = $('#' + b.id);
      if (el) el.classList.toggle('on', lit.includes(b));
    });

    const target = levels[level - 1][3];
    const topologyOnTrack = data.type === 'OPEN' || levelTopologyAccepted(data.type, target, data);
    const accepted = lit.length === bulbs.length && bulbs.length > 0 && data.valid &&
      topologyOnTrack;
    const pct = accepted ? 100 : Math.min(99, Math.round((lit.length / Math.max(1, bulbs.length)) * 100));
    const prg = $('#progress'); if (prg) prg.style.width = pct + '%';
    updateLevelProgress(lit.length, bulbs.length, accepted, topologyOnTrack);

    document.querySelectorAll('.wire').forEach(path => {
      const powered = isWirePowered(data, path.dataset.a, path.dataset.b);
      path.classList.toggle('powered', powered);
    });

    if (lit.length === bulbs.length && bulbs.length && data.valid) {
      if (levelTopologyAccepted(data.type, target, data)) finish();
    }
  }

  function isWirePowered(data, a, b) {
    if (!data.nets || data.nets.plus === undefined) return false;
    const u = data.netOf(a), v = data.netOf(b);
    const { plus } = data.nets;
    return data.type !== 'OPEN' && (u === plus || v === plus);
  }

  function finish() {
    if (completed) return;
    completed = true;
    const challengePromise = verificationChallengePromise;
    const proof = {
      wires: wires.map(({ a, b }) => ({ a, b })),
      switches: components
        .filter((component) => component.type === 'switch' && !isDecoyComponent(component))
        .map(({ id, closed }) => ({ id, closed }))
    };
    const requiredLoads = components.filter(c => c.type === 'bulb' && c.sub !== 'DECOY').length;
    updateLevelProgress(requiredLoads, requiredLoads, true);
    playSuccessSound();
    const levelClearTime = Math.floor((Date.now() - levelStartedAt) / 1000);
    updateRuntimeDisplay();
    clearInterval(timerHandle);
    recordPlayerLevel();
    saveCurrentPlayerRuntime();
    submitVerifiedCompletion(challengePromise, proof);
    const b = JSON.parse(getStoredValue(bestKey) || '{}');
    if (!b[level] || moves < b[level]) { b[level] = moves; setStoredValue(bestKey, JSON.stringify(b)); }
    if (gameMode === 'story') saveUnlockedProgress(level + 1);
    setBest();

    const mode = classifyCircuit();
    if (gameMode === 'endless') endlessStreak++;
    const showCompletionPopup = () => {
      const stEl = $('#status');
      if (stEl) stEl.textContent = `Circuit complete! ${mode} topology is powered with correct polarity.`;
      const mIcon = $('#modalIcon'); if (mIcon) mIcon.textContent = '💡';
      const mTitle = $('#modalTitle'); if (mTitle) mTitle.textContent = level === 30 ? 'YOU MASTERED WIRECRAFT!' : 'CIRCUIT COMPLETE!';
      const mText = $('#modalText');
      if (mText) {
        mText.textContent = gameMode === 'endless'
          ? `Circuit ${endlessStreak} stabilized in ${moves} moves. The next grid will be more demanding.`
          : level === 30
          ? `You completed all 30 levels in ${moves} moves.`
          : `Level ${level} solved in ${moves} move${moves === 1 ? '' : 's'} using a ${mode.toLowerCase()} circuit.`;
      }
      const mStats = $('#modalStats');
      if (mStats) mStats.textContent = `Clear time ${formatDuration(levelClearTime)} • Correct ${correctMoves} • Wrong ${wrongMoves} • Runtime ${formatDuration(Math.floor((Date.now() - sessionStartedAt) / 1000))}`;
      const nxt = $('#next');
      if (nxt) nxt.textContent = gameMode === 'endless' ? 'NEXT CIRCUIT →' : level === 30 ? 'PLAY AGAIN' : 'NEXT LEVEL →';
      const mdl = $('#modal'); if (mdl) mdl.classList.add('show');
    };
    setTimeout(showCompletionPopup, 2000);
  }

  const nextBtn = $('#next');
  if (nextBtn) {
    nextBtn.onclick = () => {
      const mdl = $('#modal'); if (mdl) mdl.classList.remove('show');
      if (gameMode === 'endless') buildLevel(level >= 30 ? 1 : level + 1);
      else buildLevel(level >= modeLevelCeiling ? 1 : level + 1);
    };
  }

  const modalBackHomeBtn = $('#modal-back-home');
  if (modalBackHomeBtn && backHomeBtn) {
    modalBackHomeBtn.addEventListener('click', () => backHomeBtn.click());
  }

  const resetBtn = $('#reset');
  if (resetBtn) resetBtn.onclick = () => buildLevel(level, gameMode === 'rush');

  const clearBtn = $('#clear');
  if (clearBtn) {
    clearBtn.onclick = () => {
      wires = []; completed = false; shorted = false;
       resetSwitchPolarities(); render(); updateStatus();
      const stEl = $('#status');
      if (stEl) stEl.textContent = 'All wires cleared. Green switch terminals are neutral and may connect to either polarity.';
    };
  }

  const checkBtn = $('#check');
  if (checkBtn) {
    checkBtn.onclick = () => {
      if (completed) return;
      updatePower();
      if (!completed) {
        const bulbs = components.filter(c => c.type === 'bulb' && c.sub !== 'DECOY');
        const on = bulbs.filter(b => {
          const el = $('#' + b.id);
          return el && el.classList.contains('on');
        }).length;
        const mode = classifyCircuit();
        showToast(`${on}/${bulbs.length} bulbs powered • ${mode} topology`);
      }
    };
  }

  function showCircuitHint() {
    if (completed) return;
    const target = levels[level - 1][3];
    const source = components.find(c => c.type === 'source');
    const start = source ? $('#' + source.id)?.querySelector('.terminal.right') : null;
    if (start) { start.classList.add('hint-pulse'); setTimeout(() => start.classList.remove('hint-pulse'), 1200); }
    const bulb = components.find(c => c.type === 'bulb' && !isDecoyComponent(c) && !wires.some(w => w.a.startsWith(c.id + '|') || w.b.startsWith(c.id + '|')));
    if (bulb) showToast(`Start at source +. ${bulb.label} still needs both terminals in the circuit.`);
    else if (target === 'SERIES') showToast('Series: make one chain — source + → bulbs (+ to −) → source −.');
    else if (target === 'PARALLEL') showToast('Parallel: each bulb needs its own branch between the same + and − rails.');
    else showToast('Mixed: make a series section, then split into at least two load branches before returning.');
  }

  const hintBtn = $('#hint-btn');
  if (hintBtn) hintBtn.addEventListener('click', showCircuitHint);

  function undoLastWire() {
    if (shorted || completed) return;
    if (!wires.length) { showToast('No wires to undo yet.'); return; }
    wires.pop();
    resetSwitchPolarities();
    wires.forEach(w => { learnSwitchPolarity(w.a, w.b);
       learnSwitchPolarity(w.b, w.a); });
    drawWires(); updateStatus(); updatePower();
    showToast('Removed last wire.');
  }

  const undoBtn = $('#undo');
  if (undoBtn) undoBtn.onclick = undoLastWire;

  function updateSoundToggleButton() {
    document.querySelectorAll('.sound-toggle').forEach((btn) => {
      btn.textContent = soundEnabled ? '🔊' : '🔇';
      btn.title = soundEnabled ? 'Music and sound on — click to mute' : 'Music and sound muted — click to unmute';
      btn.setAttribute('aria-label', soundEnabled ? 'Mute sound' : 'Unmute sound');
    });
  }

  const soundToggleBtns = document.querySelectorAll('.sound-toggle');
  if (soundToggleBtns.length) {
    updateSoundToggleButton();
    soundToggleBtns.forEach((soundToggleBtn) => soundToggleBtn.addEventListener('click', () => {
      soundEnabled = !soundEnabled;
      setStoredValue(soundPrefKey, soundEnabled ? 'on' : 'off');
      if (soundEnabled) {
        resumeAudioContext();
        if (loading && loading.style.display !== 'none' && loading.dataset.dismissed !== 'true') {
          startOpeningTrack();
        } else {
          startBackgroundMusic();
        }
      } else {
        clearToneTimers();
        stopOpeningTrack();
        stopBackgroundMusic();
      }
      updateSoundToggleButton();
    }));
  }

  document.addEventListener('keydown', (e) => {
    const loadingVisible = loading && loading.style.display !== 'none' && loading.dataset.dismissed !== 'true';
    if (loadingVisible && e.key === 'Enter' && launchVerification) {
      if (document.activeElement !== launchVerification) e.preventDefault();
      launchVerification.click();
      return;
    }
    if (!gameShell || gameShell.style.display !== 'block') return;
    const tag = document.activeElement && document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    const modalEl = $('#modal');
    const modalOpen = modalEl && modalEl.classList.contains('show');
    if (e.key === 'Escape') {
      if (modalOpen) modalEl.classList.remove('show');
      else if (backHomeBtn) backHomeBtn.click();
      return;
    }
    if (modalOpen) return;
    if (e.key === 'r' || e.key === 'R') { const r = $('#reset'); if (r) r.click(); }
    else if (e.key === 'c' || e.key === 'C') { const c = $('#check'); if (c) c.click(); }
    else if (e.key === 'h' || e.key === 'H') showCircuitHint();
    else if (e.key === 'u' || e.key === 'U' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z')) {
      e.preventDefault();
      undoLastWire();
    }
  });

  window.addEventListener('resize', () => { render(); updateStatus(); updatePower(); });

  const deepLinkParams = new URLSearchParams(window.location.search);
  const requestedDeepLinkLevel = Number.parseInt(deepLinkParams.get('level') || '', 10);
  if (Number.isFinite(requestedDeepLinkLevel)) {
    const cap = getUnlockedLevelCap();
    const safeDeepLinkLevel = Math.min(Math.max(requestedDeepLinkLevel, 1), cap);
    if (loading) { loading.dataset.dismissed = 'true'; loading.style.display = 'none'; }
    showGame(safeDeepLinkLevel);
  }
});