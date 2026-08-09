const form = document.querySelector('#postForm');
const postText = document.querySelector('#postText');
const feed = document.querySelector('#feed');
const lanAddress = document.querySelector('#lanAddress');
const siteList = document.querySelector('#siteList');
const siteGrid = document.querySelector('#siteGrid');
const siteForm = document.querySelector('#siteForm');
const siteName = document.querySelector('#siteName');
const siteUrl = document.querySelector('#siteUrl');
const siteIcon = document.querySelector('#siteIcon');
const skinChoices = document.querySelectorAll('.skin-choice');
const adSlot = document.querySelector('#adSlot');
const localTubePlayer = document.querySelector('#localTubePlayer');
const videoPlaceholder = document.querySelector('#videoPlaceholder');
const videoSource = document.querySelector('#videoSource');
const loadVideo = document.querySelector('#loadVideo');
const demoVideo = document.querySelector('#demoVideo');
const runAd = document.querySelector('#runAd');
const refreshAds = document.querySelector('#refreshAds');
const resumeStatus = document.querySelector('#resumeStatus');
const authForm = document.querySelector('#authForm');
const authUsername = document.querySelector('#authUsername');
const authPassword = document.querySelector('#authPassword');
const authStatus = document.querySelector('#authStatus');
const registerButton = document.querySelector('#registerButton');
const logoutButton = document.querySelector('#logoutButton');

const themeStorageKey = 'local-home-net-theme';
const timestampStorageKey = 'local-home-net-video-timestamp';
const videoSourceStorageKey = 'local-home-net-video-source';
let availableAds = [];
let demoTimer = null;
let demoCurrentTime = 0;
let demoWasPlaying = false;
let currentAccount = null;
let serverHasUsers = true;

const defaultSites = [
  { name: 'Files', url: '/files', icon: '📁', description: 'Shared documents and photos' },
  { name: 'Media / LocalTube', url: '/media', icon: '🎧', description: 'Videos, music, and tutorials' },
  { name: 'Announcements / Chirp', url: '/chirp', icon: '📣', description: 'Blurbs, GIFs, and images' },
  { name: 'Shopping list', url: '/shopping', icon: '🛒', description: 'Things the house needs' },
  { name: 'Chores', url: '/chores', icon: '🧹', description: 'Jobs and reminders' },
  { name: 'Manuals', url: '/manuals', icon: '🧰', description: 'Router, appliance, and tool notes' },
  { name: 'Emergency contacts', url: '/emergency', icon: '🚨', description: 'Important phone numbers' },
  { name: 'Calendar', url: '/calendar', icon: '📅', description: 'House schedule' },
  { name: 'Tutorial', url: '#tutorial', icon: '📘', description: 'How to connect devices' },
  { name: 'Site Maker', url: '#maker', icon: '➕', description: 'Add another local link' }
];

const operatorSite = {
  name: 'Server Op Settings',
  url: '/settings',
  icon: '🔐',
  description: 'Server-computer-only controls'
};

const starterPosts = [
  {
    text: 'Welcome to Chirp. This is a local-only feed for quick household blurbs, photos, GIFs, reminders, and links.',
    createdAt: 'Demo post'
  },
  {
    text: 'Router restart guide is pinned in LocalTube. Add your own household how-to videos next.',
    createdAt: 'Demo post'
  }
];


async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}

async function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  skinChoices.forEach((choice) => {
    choice.setAttribute('aria-pressed', String(choice.dataset.theme === theme));
  });
  if (currentAccount) {
    await api('/api/user-settings', { method: 'POST', body: JSON.stringify({ settings: { theme } }) }).catch(() => {});
  } else {
    localStorage.setItem(themeStorageKey, theme);
  }
}

async function loadTheme() {
  if (currentAccount) {
    const { settings } = await api('/api/user-settings').catch(() => ({ settings: { theme: 'dark' } }));
    await applyTheme(settings.theme || 'dark');
    return;
  }
  await applyTheme(localStorage.getItem(themeStorageKey) || 'dark');
}

function setResumeStatus(message) {
  if (resumeStatus) resumeStatus.textContent = message;
}

function currentVideoTime() {
  if (demoTimer) return demoCurrentTime;
  return localTubePlayer?.currentTime || 0;
}

function saveVideoTimestamp() {
  const timestamp = currentVideoTime();
  localStorage.setItem(timestampStorageKey, String(timestamp));
  setResumeStatus(`Saved timestamp ${formatTime(timestamp)} before the ad break.`);
  return timestamp;
}

function formatTime(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  const rest = String(total % 60).padStart(2, '0');
  return `${minutes}:${rest}`;
}

function pauseMainVideo() {
  if (demoTimer) {
    demoWasPlaying = true;
    clearInterval(demoTimer);
    demoTimer = null;
    return true;
  }

  if (!localTubePlayer) return false;
  const wasPlaying = !localTubePlayer.paused && !localTubePlayer.ended;
  localTubePlayer.pause();
  return wasPlaying;
}

function resumeMainVideo(timestamp, wasPlaying) {
  if (localTubePlayer?.src) {
    localTubePlayer.currentTime = timestamp;
    if (wasPlaying) localTubePlayer.play().catch(() => {});
  } else if (demoWasPlaying || wasPlaying) {
    startDemoTimer(timestamp);
  }
  setResumeStatus(`Ad finished. Resumed video at ${formatTime(timestamp)}.`);
}

function renderAdContent(ad, onFinished = () => {}) {
  adSlot.innerHTML = '';
  const ext = ad.type.toLowerCase();
  const caption = document.createElement('strong');
  caption.textContent = ad.name;

  if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'].includes(ext)) {
    const image = document.createElement('img');
    image.src = ad.url;
    image.alt = `LocalTube ad: ${ad.name}`;
    image.loading = 'lazy';
    adSlot.append(image, caption);
    setTimeout(onFinished, 5000);
    return;
  }

  if (['.mp4', '.webm'].includes(ext)) {
    const video = document.createElement('video');
    video.src = ad.url;
    video.controls = true;
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.addEventListener('ended', onFinished, { once: true });
    video.addEventListener('error', onFinished, { once: true });
    adSlot.append(video, caption);
    video.play().catch(() => {});
    return;
  }

  const textLink = document.createElement('a');
  textLink.href = ad.url;
  textLink.textContent = `Open ${ad.name}`;
  adSlot.append(textLink, caption);
  setTimeout(onFinished, 5000);
}

function renderIdleAd(ad) {
  renderAdContent(ad);
}

function runAdBreak() {
  if (!availableAds.length) {
    setResumeStatus('No ad files found. Add files to the add/ folder and press Refresh ads.');
    return;
  }

  const timestamp = saveVideoTimestamp();
  const wasPlaying = pauseMainVideo();
  const ad = availableAds[Math.floor(Math.random() * availableAds.length)];
  setResumeStatus(`Playing ad ${ad.name}. Video will resume at ${formatTime(timestamp)}.`);
  renderAdContent(ad, () => resumeMainVideo(timestamp, wasPlaying));
}

async function loadAds() {
  if (!adSlot) return;
  try {
    const response = await fetch('/api/ads', { cache: 'no-store' });
    if (!response.ok) throw new Error('Ad list failed');
    const { ads } = await response.json();
    availableAds = ads;
    if (!availableAds.length) return;
    renderIdleAd(availableAds[Math.floor(Math.random() * availableAds.length)]);
  } catch (error) {
    adSlot.textContent = 'Ad folder could not be read right now.';
  }
}

function startDemoTimer(startAt = 0) {
  if (demoTimer) clearInterval(demoTimer);
  demoCurrentTime = startAt;
  localTubePlayer.removeAttribute('src');
  localTubePlayer.load();
  videoPlaceholder.hidden = false;
  videoPlaceholder.querySelector('strong').textContent = 'Demo video timer running';
  demoTimer = setInterval(() => {
    demoCurrentTime += 1;
    localStorage.setItem(timestampStorageKey, String(demoCurrentTime));
    setResumeStatus(`Demo video time: ${formatTime(demoCurrentTime)}. Press Run ad to test resume.`);
  }, 1000);
}

function loadLocalVideo(source) {
  if (!source) return;
  if (demoTimer) {
    clearInterval(demoTimer);
    demoTimer = null;
  }
  localTubePlayer.src = source;
  localStorage.setItem(videoSourceStorageKey, source);
  videoPlaceholder.hidden = true;
  localTubePlayer.load();
  const savedTime = Number(localStorage.getItem(timestampStorageKey) || 0);
  localTubePlayer.addEventListener('loadedmetadata', () => {
    if (savedTime > 0 && savedTime < localTubePlayer.duration) {
      localTubePlayer.currentTime = savedTime;
      setResumeStatus(`Loaded video and restored timestamp ${formatTime(savedTime)}.`);
    }
  }, { once: true });
}

function restoreVideoSource() {
  const savedSource = localStorage.getItem(videoSourceStorageKey);
  if (savedSource) {
    videoSource.value = savedSource;
    loadLocalVideo(savedSource);
  }
}

function setAuthStatus(message) {
  if (authStatus) authStatus.textContent = message;
}

function updateAuthUi() {
  if (!authForm) return;
  logoutButton.hidden = !currentAccount;
  registerButton.hidden = currentAccount || serverHasUsers;
  if (currentAccount) {
    setAuthStatus(`Logged in as ${currentAccount.username} (${currentAccount.role}). Data is saved on this server.`);
  } else if (!serverHasUsers) {
    setAuthStatus('No users exist yet. Register the first account to become the server operator.');
  } else {
    setAuthStatus('Login to save posts, sites, and settings on the server.');
  }
}

async function refreshAccount() {
  const { user, hasUsers } = await api('/api/me');
  currentAccount = user;
  serverHasUsers = hasUsers;
  updateAuthUi();
  await loadTheme();
  await renderSites();
  await renderPosts();
}

async function submitAuth(path) {
  const username = authUsername.value.trim();
  const password = authPassword.value;
  if (!username || !password) return;
  const { user } = await api(path, { method: 'POST', body: JSON.stringify({ username, password }) });
  currentAccount = user;
  authPassword.value = '';
  updateAuthUi();
  await loadTheme();
  await renderSites();
  await renderPosts();
}

function updateLanAddress() {
  if (!lanAddress) return;
  const host = window.location.hostname || 'your-computer-ip';
  const port = window.location.port || '8080';
  lanAddress.textContent = `http://${host}:${port}`;
}

async function loadPosts() {
  if (!currentAccount) return starterPosts;
  const { posts } = await api('/api/posts').catch(() => ({ posts: starterPosts }));
  return posts;
}

function isServerComputer() {
  return ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
}

async function loadSites() {
  const visibleDefaultSites = isServerComputer() ? [...defaultSites, operatorSite] : defaultSites;
  if (!currentAccount) return visibleDefaultSites;
  const { sites } = await api('/api/sites').catch(() => ({ sites: [] }));
  return [...visibleDefaultSites, ...sites];
}

function mediaUrlFrom(text) {
  const match = text.match(/https?:\/\/\S+\.(gif|png|jpe?g|webp)(\?\S*)?/i);
  return match ? match[0] : null;
}

async function renderSites() {
  const sites = await loadSites();
  siteList.innerHTML = '';
  siteGrid.innerHTML = '';

  sites.forEach((site) => {
    const item = document.createElement('li');
    const listLink = document.createElement('a');
    const listIcon = document.createElement('span');
    const listName = document.createElement('strong');
    const listDescription = document.createElement('small');
    listLink.href = site.url;
    listIcon.textContent = site.icon;
    listName.textContent = site.name;
    listDescription.textContent = `${site.url} — ${site.description}`;
    listLink.append(listIcon, listName, listDescription);
    item.append(listLink);
    siteList.append(item);

    const cardLink = document.createElement('a');
    const cardName = document.createElement('strong');
    const cardUrl = document.createElement('span');
    cardLink.href = site.url;
    cardName.textContent = `${site.icon} ${site.name}`;
    cardUrl.textContent = site.url;
    cardLink.append(cardName, cardUrl);
    siteGrid.append(cardLink);
  });
}

async function renderPosts() {
  const posts = await loadPosts();
  feed.innerHTML = '';
  posts.forEach((post) => {
    const article = document.createElement('article');
    article.className = 'post';

    const paragraph = document.createElement('p');
    paragraph.textContent = post.text;
    article.append(paragraph);

    const mediaUrl = mediaUrlFrom(post.text);
    if (mediaUrl) {
      const image = document.createElement('img');
      image.src = mediaUrl;
      image.alt = 'Shared local post media';
      image.loading = 'lazy';
      article.append(image);
    }

    const time = document.createElement('time');
    time.textContent = post.author ? `${post.author} · ${new Date(post.createdAt).toLocaleString()}` : post.createdAt;
    article.append(time);
    feed.append(article);
  });
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const text = postText.value.trim();
  if (!text) return;
  if (!currentAccount) {
    setAuthStatus('Login first so posts save on the server.');
    return;
  }

  await api('/api/posts', { method: 'POST', body: JSON.stringify({ text }) });
  postText.value = '';
  renderPosts();
});

authForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  await submitAuth('/api/login').catch((error) => setAuthStatus(error.message));
});

registerButton.addEventListener('click', async () => {
  await submitAuth('/api/register').catch((error) => setAuthStatus(error.message));
});

logoutButton.addEventListener('click', async () => {
  await api('/api/logout', { method: 'POST' });
  currentAccount = null;
  updateAuthUi();
  await renderSites();
  await renderPosts();
});

skinChoices.forEach((choice) => {
  choice.addEventListener('click', () => applyTheme(choice.dataset.theme));
});

loadVideo.addEventListener('click', () => loadLocalVideo(videoSource.value.trim()));
demoVideo.addEventListener('click', () => startDemoTimer(Number(localStorage.getItem(timestampStorageKey) || 0)));
runAd.addEventListener('click', runAdBreak);
refreshAds.addEventListener('click', loadAds);

siteForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const name = siteName.value.trim();
  const url = siteUrl.value.trim();
  if (!name || !url) return;
  if (!currentAccount) {
    setAuthStatus('Login first so custom sites save on the server.');
    return;
  }

  await api('/api/sites', {
    method: 'POST',
    body: JSON.stringify({ name, url, icon: siteIcon.value.trim() || '🔗' })
  });
  siteForm.reset();
  renderSites();
});

updateLanAddress();
refreshAccount().catch(() => { updateAuthUi(); loadTheme(); renderSites(); renderPosts(); });
restoreVideoSource();
loadAds();
