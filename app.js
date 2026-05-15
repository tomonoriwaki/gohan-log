const POSTS_KEY = "mogu-log-posts-v4";
const SESSION_KEY = "mogu-log-session-v1";
const SOUND_KEY = "mogu-log-sound-enabled-v1";
const CHROME_KEY = "mogu-log-chrome-hidden-v1";
const POSTS_API = "/.netlify/functions/posts";
const MEDIA_API = "/.netlify/functions/media";
const CAN_USE_SHARED_POSTS = location.protocol !== "file:";

const sessionId = getSessionId();
const demoPosts = [
  {
    id: crypto.randomUUID(),
    title: "焼き鮭とお味噌汁の朝ごはん",
    description: "あたたかいお味噌汁で一日がちゃんと始まる感じ。小鉢の漬物もよかったです。",
    image: "https://images.unsplash.com/photo-1617093727343-374698b1b08d?auto=format&fit=crop&w=900&q=80",
    author: "mogu",
    ownerEmail: "demo",
    time: "サンプル",
    likedBy: [],
    resharedBy: [],
    location: { enabled: true, shopName: "いつもの食卓", latitude: null, longitude: null },
  },
  {
    id: crypto.randomUUID(),
    title: "ふわふわ卵のオムライス",
    description: "ケチャップの酸味と卵の甘さがちょうどよくて、また食べたい一皿でした。",
    image: "https://images.unsplash.com/photo-1633964913295-ceb43826e7c2?auto=format&fit=crop&w=900&q=80",
    author: "mogu",
    ownerEmail: "demo",
    time: "サンプル",
    likedBy: [],
    resharedBy: [],
    location: null,
  },
  {
    id: crypto.randomUUID(),
    title: "抹茶と季節の甘味",
    description: "食後にゆっくり味わいたい甘さ。写真を見返すだけで少し落ち着きます。",
    image: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=900&q=80",
    author: "mogu",
    ownerEmail: "demo",
    time: "サンプル",
    likedBy: [],
    resharedBy: [],
    location: null,
  },
];

const elements = {
  body: document.body,
  chromeToggle: document.querySelector("#chromeToggle"),
  chromeTogglePanel: document.querySelector("#chromeTogglePanel"),
  focusPostButton: document.querySelector("#focusPostButton"),
  focusDeleteButton: document.querySelector("#focusDeleteButton"),
  soundToggle: document.querySelector("#soundToggle"),
  soundTogglePanel: document.querySelector("#soundTogglePanel"),
  postForm: document.querySelector("#postForm"),
  photoInput: document.querySelector("#photoInput"),
  titleInput: document.querySelector("#titleInput"),
  descriptionInput: document.querySelector("#descriptionInput"),
  locationToggle: document.querySelector("#locationToggle"),
  locationFields: document.querySelector("#locationFields"),
  shopNameInput: document.querySelector("#shopNameInput"),
  getLocationButton: document.querySelector("#getLocationButton"),
  locationStatus: document.querySelector("#locationStatus"),
  imageEditor: document.querySelector("#imageEditor"),
  previewCanvas: document.querySelector("#previewCanvas"),
  brightnessInput: document.querySelector("#brightnessInput"),
  contrastInput: document.querySelector("#contrastInput"),
  saturationInput: document.querySelector("#saturationInput"),
  warmthInput: document.querySelector("#warmthInput"),
  rotateButton: document.querySelector("#rotateButton"),
  resetImageButton: document.querySelector("#resetImageButton"),
  searchInput: document.querySelector("#searchInput"),
  searchBox: document.querySelector("#searchBox"),
  feed: document.querySelector("#feed"),
  postTemplate: document.querySelector("#postTemplate"),
  postCount: document.querySelector("#postCount"),
  emptyState: document.querySelector("#emptyState"),
};

let posts = loadPosts();
let sourceImage = null;
let imageRotation = 0;
let soundEnabled = localStorage.getItem(SOUND_KEY) === "true";
let audioContext = null;
let selectedLocation = null;

function getSessionId() {
  const savedId = localStorage.getItem(SESSION_KEY);

  if (savedId) {
    return savedId;
  }

  const nextId = crypto.randomUUID();
  localStorage.setItem(SESSION_KEY, nextId);
  return nextId;
}

function normalizePost(post) {
  return {
    ...post,
    id: post.id || crypto.randomUUID(),
    title: post.title || "無題のごはん",
    description: post.description || "",
    image: post.image || "",
    author: post.author || "mogu",
    ownerEmail: post.ownerEmail || sessionId,
    time: post.time || "いま",
    likedBy: Array.isArray(post.likedBy) ? post.likedBy : [],
    resharedBy: Array.isArray(post.resharedBy) ? post.resharedBy : [],
    location: post.location || null,
  };
}

function loadPosts() {
  const savedPosts = localStorage.getItem(POSTS_KEY);

  if (!savedPosts) {
    return demoPosts.map(normalizePost);
  }

  try {
    return JSON.parse(savedPosts).map(normalizePost);
  } catch {
    return demoPosts.map(normalizePost);
  }
}

function savePosts() {
  localStorage.setItem(POSTS_KEY, JSON.stringify(posts));
}

async function requestSharedPosts(action, payload = {}) {
  if (!CAN_USE_SHARED_POSTS) {
    return null;
  }

  try {
    const response = await fetch(POSTS_API, {
      method: action ? "POST" : "GET",
      headers: action ? { "Content-Type": "application/json" } : undefined,
      body: action ? JSON.stringify({ action, ...payload }) : undefined,
    });

    if (!response.ok) {
      throw new Error("Shared post request failed");
    }

    const data = await response.json();

    if (Array.isArray(data.posts) && data.posts.length > 0) {
      posts = data.posts.map(normalizePost);
      savePosts();
      renderPosts();
    }

    return data;
  } catch (error) {
    console.warn("共有投稿の同期に失敗しました。ローカル保存で続けます。", error);
    return null;
  }
}

async function uploadSharedImage(dataUrl) {
  if (!CAN_USE_SHARED_POSTS) {
    return dataUrl;
  }

  try {
    const response = await fetch(MEDIA_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dataUrl }),
    });

    if (!response.ok) {
      throw new Error("Image upload failed");
    }

    const data = await response.json();
    return data.url || dataUrl;
  } catch (error) {
    console.warn("画像の共有保存に失敗しました。ローカル画像で続けます。", error);
    return dataUrl;
  }
}

function getFilteredPosts() {
  const keyword = elements.searchInput.value.trim().toLowerCase();

  if (!keyword) {
    return posts;
  }

  return posts.filter((post) => {
    const text = `${post.title} ${post.description} ${post.author} ${post.location?.shopName || ""}`.toLowerCase();
    return text.includes(keyword);
  });
}

function renderPosts() {
  const visiblePosts = getFilteredPosts();

  elements.feed.innerHTML = "";
  elements.postCount.textContent = posts.length;
  elements.emptyState.hidden = visiblePosts.length > 0;

  visiblePosts.forEach((post) => {
    const card = elements.postTemplate.content.firstElementChild.cloneNode(true);
    const image = card.querySelector(".post-image");
    const title = card.querySelector("h3");
    const description = card.querySelector("p");
    const author = card.querySelector(".author");
    const time = card.querySelector(".time");
    const likeButton = card.querySelector(".like-button");
    const heart = card.querySelector(".heart");
    const likeCount = card.querySelector(".like-count");
    const boostButton = card.querySelector(".boost-button");
    const boostCount = card.querySelector(".boost-count");
    const shareButton = card.querySelector(".share-button");
    const deleteButton = card.querySelector(".delete-button");
    const locationBox = card.querySelector(".post-location");
    const shopName = card.querySelector(".shop-name");
    const mapLink = card.querySelector(".map-link");
    const liked = post.likedBy.includes(sessionId);
    const boosted = post.resharedBy.includes(sessionId);

    image.src = post.image;
    image.alt = `${post.title}の写真`;
    title.textContent = post.title;
    description.textContent = post.description;
    author.textContent = `@${post.author}`;
    time.textContent = post.time;
    heart.textContent = liked ? "♥" : "♡";
    likeCount.textContent = post.likedBy.length;
    likeButton.classList.toggle("is-liked", liked);
    boostCount.textContent = post.resharedBy.length;
    boostButton.classList.toggle("is-boosted", boosted);

    if (post.location?.enabled && (post.location.shopName || post.location.latitude)) {
      locationBox.hidden = false;
      shopName.textContent = post.location.shopName || "位置情報つき投稿";

      if (post.location.latitude && post.location.longitude) {
        mapLink.hidden = false;
        mapLink.href = `https://www.google.com/maps/search/?api=1&query=${post.location.latitude},${post.location.longitude}`;
      } else {
        mapLink.hidden = true;
      }
    }

    likeButton.addEventListener("click", () => toggleLike(post.id, likeButton));
    boostButton.addEventListener("click", () => toggleBoost(post.id, boostButton));
    shareButton.addEventListener("click", () => sharePost(post));
    deleteButton.addEventListener("click", () => deletePost(post.id));

    elements.feed.append(card);
  });
}

async function toggleLike(postId, button) {
  showHeartBurst(button);
  button.classList.add("is-popping");
  setTimeout(() => button.classList.remove("is-popping"), 380);

  posts = posts.map((post) => {
    if (post.id !== postId) {
      return post;
    }

    const liked = post.likedBy.includes(sessionId);
    return {
      ...post,
      likedBy: liked ? post.likedBy.filter((id) => id !== sessionId) : [...post.likedBy, sessionId],
    };
  });

  savePosts();
  renderPosts();
  playSound("like");
  await requestSharedPosts("toggleLike", { postId, email: sessionId });
}

async function toggleBoost(postId, button) {
  button.classList.add("is-popping");
  setTimeout(() => button.classList.remove("is-popping"), 380);

  posts = posts.map((post) => {
    if (post.id !== postId) {
      return post;
    }

    const boosted = post.resharedBy.includes(sessionId);
    return {
      ...post,
      resharedBy: boosted ? post.resharedBy.filter((id) => id !== sessionId) : [...post.resharedBy, sessionId],
    };
  });

  savePosts();
  renderPosts();
  playSound("boost");
  await requestSharedPosts("toggleBoost", { postId, email: sessionId });
}

async function sharePost(post) {
  const text = `もぐログ: ${post.title}`;
  const url = location.href.split("#")[0];

  playSound("tap");

  if (navigator.share) {
    await navigator.share({ title: post.title, text, url });
    return;
  }

  try {
    await navigator.clipboard.writeText(`${text}\n${url}`);
    alert("共有用の文章をコピーしました。");
  } catch {
    alert(`${text}\n${url}`);
  }
}

async function deletePost(postId) {
  const ok = confirm("この投稿を削除しますか？");

  if (!ok) {
    return;
  }

  posts = posts.filter((post) => post.id !== postId);
  savePosts();
  renderPosts();
  playSound("delete");
  await requestSharedPosts("delete", { postId, email: sessionId, isAdmin: false });
}

function getPostLocation() {
  if (!elements.locationToggle.checked) {
    return null;
  }

  return {
    enabled: true,
    shopName: elements.shopNameInput.value.trim(),
    latitude: selectedLocation?.latitude || null,
    longitude: selectedLocation?.longitude || null,
  };
}

function resetLocationForm() {
  selectedLocation = null;
  elements.locationToggle.checked = false;
  elements.locationFields.hidden = true;
  elements.shopNameInput.value = "";
  elements.locationStatus.textContent = "位置情報はまだ取得していません。";
}

function drawPreview() {
  if (!sourceImage) {
    return;
  }

  const canvas = elements.previewCanvas;
  const context = canvas.getContext("2d");
  const rotated = imageRotation % 180 !== 0;
  const sourceWidth = rotated ? sourceImage.height : sourceImage.width;
  const sourceHeight = rotated ? sourceImage.width : sourceImage.height;
  const scale = Math.max(canvas.width / sourceWidth, canvas.height / sourceHeight);
  const drawWidth = sourceImage.width * scale;
  const drawHeight = sourceImage.height * scale;

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.save();
  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate((imageRotation * Math.PI) / 180);
  context.filter = `brightness(${elements.brightnessInput.value}%) contrast(${elements.contrastInput.value}%) saturate(${elements.saturationInput.value}%)`;
  context.drawImage(sourceImage, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
  context.filter = "none";

  const warmth = Number(elements.warmthInput.value) / 100;
  if (warmth > 0) {
    context.globalCompositeOperation = "soft-light";
    context.fillStyle = `rgba(255, 169, 86, ${warmth})`;
    context.fillRect(-canvas.width, -canvas.height, canvas.width * 2, canvas.height * 2);
  }

  context.restore();
}

function resetImageControls() {
  elements.brightnessInput.value = "100";
  elements.contrastInput.value = "105";
  elements.saturationInput.value = "110";
  elements.warmthInput.value = "10";
  imageRotation = 0;
  drawPreview();
}

function getPostImageDataUrl() {
  if (!sourceImage) {
    return "";
  }

  drawPreview();
  return elements.previewCanvas.toDataURL("image/jpeg", 0.9);
}

function readImageFile(file) {
  const reader = new FileReader();

  reader.addEventListener("load", () => {
    const image = new Image();
    image.addEventListener("load", () => {
      sourceImage = image;
      elements.imageEditor.hidden = false;
      resetImageControls();
      playSound("tap");
    });
    image.src = reader.result;
  });

  reader.readAsDataURL(file);
}

async function createPost(event) {
  event.preventDefault();

  const fallbackImage = "https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?auto=format&fit=crop&w=900&q=80";
  const dataUrl = getPostImageDataUrl();
  const imageUrl = dataUrl ? await uploadSharedImage(dataUrl) : fallbackImage;
  const post = normalizePost({
    id: crypto.randomUUID(),
    title: elements.titleInput.value.trim(),
    description: elements.descriptionInput.value.trim(),
    image: imageUrl,
    author: "mogu",
    ownerEmail: sessionId,
    time: "いま",
    likedBy: [],
    resharedBy: [],
    location: getPostLocation(),
  });

  posts = [post, ...posts];
  savePosts();
  elements.postForm.reset();
  sourceImage = null;
  imageRotation = 0;
  elements.imageEditor.hidden = true;
  resetLocationForm();
  renderPosts();
  playSound("post");
  document.querySelector("#feedSection").scrollIntoView({ behavior: "smooth", block: "start" });
  await requestSharedPosts("create", { post });
}

function setSoundEnabled(enabled) {
  soundEnabled = enabled;
  localStorage.setItem(SOUND_KEY, String(enabled));
  elements.soundToggle.checked = enabled;
  elements.soundTogglePanel.checked = enabled;

  if (enabled) {
    playSound("tap");
  }
}

function playSound(type) {
  if (!soundEnabled) {
    return;
  }

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  audioContext ||= new AudioContextClass();
  const now = audioContext.currentTime;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const frequencies = {
    tap: [520, 620],
    like: [680, 920],
    boost: [420, 760],
    post: [520, 760],
    delete: [260, 180],
  }[type] || [440, 520];

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequencies[0], now);
  oscillator.frequency.exponentialRampToValueAtTime(frequencies[1], now + 0.08);
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.exponentialRampToValueAtTime(0.09, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.17);
}

function showHeartBurst(anchor) {
  const rect = anchor.getBoundingClientRect();

  for (let index = 0; index < 6; index += 1) {
    const heart = document.createElement("span");
    heart.className = "float-heart";
    heart.textContent = "♥";
    heart.style.left = `${rect.left + rect.width / 2 + (index - 2.5) * 8}px`;
    heart.style.top = `${rect.top + 4}px`;
    heart.style.animationDelay = `${index * 28}ms`;
    document.body.append(heart);
    heart.addEventListener("animationend", () => heart.remove());
  }
}

function setChromeHidden(hidden) {
  elements.body.classList.toggle("chrome-hidden", hidden);
  elements.chromeToggle.textContent = hidden ? "上の画面を表示" : "上の画面を隠す";
  elements.chromeToggle.setAttribute("aria-expanded", String(!hidden));
  localStorage.setItem(CHROME_KEY, String(hidden));
}

function syncNavigation(targetId) {
  document.querySelectorAll(".nav-button").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.jump === targetId);
  });
}

elements.postForm.addEventListener("submit", createPost);

elements.photoInput.addEventListener("change", () => {
  const file = elements.photoInput.files[0];

  if (file) {
    readImageFile(file);
  }
});

[elements.brightnessInput, elements.contrastInput, elements.saturationInput, elements.warmthInput].forEach((input) => {
  input.addEventListener("input", drawPreview);
});

elements.rotateButton.addEventListener("click", () => {
  imageRotation = (imageRotation + 90) % 360;
  drawPreview();
  playSound("tap");
});

elements.resetImageButton.addEventListener("click", () => {
  resetImageControls();
  playSound("tap");
});

elements.locationToggle.addEventListener("change", () => {
  elements.locationFields.hidden = !elements.locationToggle.checked;

  if (!elements.locationToggle.checked) {
    resetLocationForm();
  }
});

elements.getLocationButton.addEventListener("click", () => {
  if (!navigator.geolocation) {
    elements.locationStatus.textContent = "このブラウザでは現在地を取得できません。";
    return;
  }

  elements.locationStatus.textContent = "現在地を取得しています...";
  navigator.geolocation.getCurrentPosition(
    (position) => {
      selectedLocation = {
        latitude: Number(position.coords.latitude.toFixed(6)),
        longitude: Number(position.coords.longitude.toFixed(6)),
      };
      elements.locationStatus.textContent = `取得しました: ${selectedLocation.latitude}, ${selectedLocation.longitude}`;
      playSound("tap");
    },
    () => {
      selectedLocation = null;
      elements.locationStatus.textContent = "現在地を取得できませんでした。ブラウザの許可設定を確認してください。";
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000,
    },
  );
});

elements.searchInput.addEventListener("input", renderPosts);

elements.focusPostButton.addEventListener("click", () => {
  document.querySelector("#composer").scrollIntoView({ behavior: "smooth", block: "start" });
  elements.titleInput.focus();
  playSound("tap");
});

elements.focusDeleteButton.addEventListener("click", () => {
  document.querySelector("#feedSection").scrollIntoView({ behavior: "smooth", block: "start" });
  document.querySelector(".delete-button")?.focus();
  playSound("tap");
});

elements.chromeToggle.addEventListener("click", () => {
  setChromeHidden(!elements.body.classList.contains("chrome-hidden"));
  playSound("tap");
});

elements.chromeTogglePanel.addEventListener("click", () => {
  setChromeHidden(!elements.body.classList.contains("chrome-hidden"));
  playSound("tap");
});

elements.soundToggle.addEventListener("change", () => setSoundEnabled(elements.soundToggle.checked));
elements.soundTogglePanel.addEventListener("change", () => setSoundEnabled(elements.soundTogglePanel.checked));

document.querySelectorAll(".nav-button").forEach((button) => {
  button.addEventListener("click", () => {
    const jump = button.dataset.jump;
    const target =
      jump === "feed"
        ? document.querySelector("#feedSection")
        : jump === "search"
          ? elements.searchBox
          : jump === "settings"
            ? document.querySelector("#settingsSection")
            : document.querySelector("#composer");

    syncNavigation(jump);
    target.scrollIntoView({ behavior: "smooth", block: "start" });

    if (jump === "search") {
      elements.searchInput.focus();
    }

    playSound("tap");
  });
});

elements.soundToggle.checked = soundEnabled;
elements.soundTogglePanel.checked = soundEnabled;
setChromeHidden(localStorage.getItem(CHROME_KEY) === "true");
renderPosts();
requestSharedPosts();
