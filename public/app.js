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
const postStorageKey = 'local-home-net-posts';
const siteStorageKey = 'local-home-net-sites';
const themeStorageKey = 'local-home-net-theme';

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


function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(themeStorageKey, theme);
  skinChoices.forEach((choice) => {
    choice.setAttribute('aria-pressed', String(choice.dataset.theme === theme));
  });
}

function loadTheme() {
  applyTheme(localStorage.getItem(themeStorageKey) || 'dark');
}

function renderAd(ad) {
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
    return;
  }

  if (['.mp4', '.webm'].includes(ext)) {
    const video = document.createElement('video');
    video.src = ad.url;
    video.controls = true;
    video.muted = true;
    video.loop = true;
    adSlot.append(video, caption);
    return;
  }

  const textLink = document.createElement('a');
  textLink.href = ad.url;
  textLink.textContent = `Open ${ad.name}`;
  adSlot.append(textLink, caption);
}

async function loadAds() {
  if (!adSlot) return;
  try {
    const response = await fetch('/api/ads', { cache: 'no-store' });
    if (!response.ok) throw new Error('Ad list failed');
    const { ads } = await response.json();
    if (!ads.length) return;
    renderAd(ads[Math.floor(Math.random() * ads.length)]);
  } catch (error) {
    adSlot.textContent = 'Ad folder could not be read right now.';
  }
}

function updateLanAddress() {
  if (!lanAddress) return;
  const host = window.location.hostname || 'your-computer-ip';
  const port = window.location.port || '8080';
  lanAddress.textContent = `http://${host}:${port}`;
}

function loadPosts() {
  const saved = localStorage.getItem(postStorageKey);
  return saved ? JSON.parse(saved) : starterPosts;
}

function savePosts(posts) {
  localStorage.setItem(postStorageKey, JSON.stringify(posts));
}

function loadSites() {
  const saved = localStorage.getItem(siteStorageKey);
  return saved ? [...defaultSites, ...JSON.parse(saved)] : defaultSites;
}

function saveCustomSite(site) {
  const saved = localStorage.getItem(siteStorageKey);
  const customSites = saved ? JSON.parse(saved) : [];
  customSites.push(site);
  localStorage.setItem(siteStorageKey, JSON.stringify(customSites));
}

function mediaUrlFrom(text) {
  const match = text.match(/https?:\/\/\S+\.(gif|png|jpe?g|webp)(\?\S*)?/i);
  return match ? match[0] : null;
}

function renderSites() {
  const sites = loadSites();
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

function renderPosts() {
  const posts = loadPosts();
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
    time.textContent = post.createdAt;
    article.append(time);
    feed.append(article);
  });
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const text = postText.value.trim();
  if (!text) return;

  const posts = loadPosts();
  posts.unshift({
    text,
    createdAt: new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
  });
  savePosts(posts.slice(0, 30));
  postText.value = '';
  renderPosts();
});

skinChoices.forEach((choice) => {
  choice.addEventListener('click', () => applyTheme(choice.dataset.theme));
});

siteForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const name = siteName.value.trim();
  const url = siteUrl.value.trim();
  if (!name || !url) return;

  saveCustomSite({
    name,
    url,
    icon: siteIcon.value.trim() || '🔗',
    description: 'Custom local site'
  });
  siteForm.reset();
  renderSites();
});

loadTheme();
updateLanAddress();
renderSites();
renderPosts();
loadAds();
