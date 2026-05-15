const POSTS_KEY = "gohan-log-posts-v2";
const USERS_KEY = "gohan-log-users-v1";
const SESSION_KEY = "gohan-log-current-user-v1";
const POSTS_API = "/.netlify/functions/posts";
const MEDIA_API = "/.netlify/functions/media";
const CAN_USE_SHARED_POSTS = location.protocol !== "file:";

const initialPosts = [
  {
    id: crypto.randomUUID(),
    title: "炭火焼き鮭の定食",
    description: "香ばしい鮭と具だくさんの味噌汁。昼に食べたい、落ち着く一皿。",
    image:
      "https://images.unsplash.com/photo-1617093727343-374698b1b08d?auto=format&fit=crop&w=900&q=80",
    author: "haru",
    ownerEmail: "haru@example.com",
    time: "12分前",
    likedBy: [],
  },
  {
    id: crypto.randomUUID(),
    title: "だし巻き玉子と小鉢",
    description: "ふわっとした卵に、やさしい出汁。朝ごはんにも夜食にも合いそう。",
    image:
      "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=900&q=80",
    author: "sora",
    ownerEmail: "sora@example.com",
    time: "34分前",
    likedBy: [],
  },
  {
    id: crypto.randomUUID(),
    title: "抹茶と季節の甘味",
    description: "食後の一服。器の色まで含めて、ゆっくり味わいたくなる時間。",
    image:
      "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=900&q=80",
    author: "ren",
    ownerEmail: "ren@example.com",
    time: "1時間前",
    likedBy: [],
  },
];

const feed = document.querySelector("#feed");
const postTemplate = document.querySelector("#postTemplate");
const postForm = document.querySelector("#postForm");
const titleInput = document.querySelector("#titleInput");
const descriptionInput = document.querySelector("#descriptionInput");
const photoInput = document.querySelector("#photoInput");
const locationToggle = document.querySelector("#locationToggle");
const locationFields = document.querySelector("#locationFields");
const shopNameInput = document.querySelector("#shopNameInput");
const getLocationButton = document.querySelector("#getLocationButton");
const locationStatus = document.querySelector("#locationStatus");
const postCount = document.querySelector("#postCount");
const focusPostButton = document.querySelector("#focusPostButton");
const accountButton = document.querySelector("#accountButton");
const accountDialog = document.querySelector("#accountDialog");
const accountForm = document.querySelector("#accountForm");
const closeAccountButton = document.querySelector("#closeAccountButton");
const nameInput = document.querySelector("#nameInput");
const emailInput = document.querySelector("#emailInput");
const passwordInput = document.querySelector("#passwordInput");
const currentUserLabel = document.querySelector("#currentUserLabel");
const currentUserBio = document.querySelector("#currentUserBio");
const currentAvatar = document.querySelector("#currentAvatar");
const logoutButton = document.querySelector("#logoutButton");
const searchInput = document.querySelector("#searchInput");
const tabButtons = document.querySelectorAll(".tab-button");
const navButtons = document.querySelectorAll(".nav-button");
const feedTitle = document.querySelector("#feedTitle");
const emptyState = document.querySelector("#emptyState");
const profileDialog = document.querySelector("#profileDialog");
const profileForm = document.querySelector("#profileForm");
const profileNameInput = document.querySelector("#profileNameInput");
const profileBioInput = document.querySelector("#profileBioInput");
const profileIconInput = document.querySelector("#profileIconInput");
const avatarImageInput = document.querySelector("#avatarImageInput");
const avatarCanvas = document.querySelector("#avatarCanvas");
const avatarZoomInput = document.querySelector("#avatarZoomInput");
const avatarXInput = document.querySelector("#avatarXInput");
const avatarYInput = document.querySelector("#avatarYInput");
const homeIconInput = document.querySelector("#homeIconInput");
const homeNavIcon = document.querySelector("#homeNavIcon");
const closeProfileButton = document.querySelector("#closeProfileButton");
const swatches = document.querySelectorAll(".swatch");

let selectedProfileColor = "#2b2a27";
let avatarSourceImage = null;
let selectedAvatarDataUrl = "";
let avatarImageChanged = false;

let posts = loadPosts();
let users = loadUsers();
let currentUser = loadCurrentUser();
let currentView = "timeline";
let selectedLocation = null;

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

    if (Array.isArray(data.posts)) {
      posts = data.posts.map(normalizePost);
      savePosts();
      renderPosts();
    }

    return data;
  } catch (error) {
    console.warn("共有投稿の同期に失敗しました。ローカル保存で続行します。", error);
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
    console.warn("画像の共有保存に失敗しました。ローカル画像で続行します。", error);
    return dataUrl;
  }
}

function loadPosts() {
  const savedPosts = localStorage.getItem(POSTS_KEY);

  if (!savedPosts) {
    return initialPosts.map(normalizePost);
  }

  try {
    return JSON.parse(savedPosts).map(normalizePost);
  } catch {
    return initialPosts.map(normalizePost);
  }
}

function loadUsers() {
  try {
    return (JSON.parse(localStorage.getItem(USERS_KEY)) || []).map(normalizeUser);
  } catch {
    return [];
  }
}

function loadCurrentUser() {
  try {
    const savedUser = JSON.parse(localStorage.getItem(SESSION_KEY));
    return savedUser ? normalizeUser(savedUser) : null;
  } catch {
    return null;
  }
}

function normalizePost(post) {
  return {
    ...post,
    id: post.id || crypto.randomUUID(),
    likedBy: post.likedBy || [],
    resharedBy: post.resharedBy || [],
    reports: post.reports || [],
    hidden: Boolean(post.hidden),
    location: post.location || null,
    authorAvatarText: post.authorAvatarText || "",
    authorAvatarColor: post.authorAvatarColor || "#2b2a27",
    authorAvatarImage: post.authorAvatarImage || "",
  };
}

function normalizeUser(user) {
  const fallbackName = user.name || "user";

  return {
    ...user,
    name: fallbackName,
    bio: user.bio || "",
    avatarText: user.avatarText || getInitials(fallbackName) || "G",
    avatarColor: user.avatarColor || "#2b2a27",
    avatarImage: user.avatarImage || "",
    homeIcon: user.homeIcon || "⌂",
  };
}

function savePosts() {
  localStorage.setItem(POSTS_KEY, JSON.stringify(posts));
}

function saveUsers() {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function saveSession() {
  if (currentUser) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));
    return;
  }

  localStorage.removeItem(SESSION_KEY);
}

async function loadSharedPosts() {
  await requestSharedPosts();
}

function getVisiblePosts() {
  const keyword = searchInput.value.trim().toLowerCase();
  let visiblePosts = posts.filter((post) => currentUser?.isAdmin || !post.hidden);

  if (currentView === "liked") {
    visiblePosts = visiblePosts.filter((post) => currentUser && post.likedBy.includes(currentUser.email));
  }

  if (currentView === "search" || keyword) {
    visiblePosts = visiblePosts.filter((post) => {
      const text = `${post.title} ${post.description} ${post.author} ${post.location?.shopName || ""}`.toLowerCase();
      return text.includes(keyword);
    });
  }

  return visiblePosts;
}

function updateAccountView() {
  if (!currentUser) {
    currentUserLabel.textContent = "未ログイン";
    currentUserBio.textContent = "アカウントを作成すると、プロフィールを設定できます。";
    setAvatarElement(currentAvatar, { avatarText: "G", avatarColor: "#2b2a27", avatarImage: "" });
    homeNavIcon.textContent = "⌂";
    accountButton.textContent = "アカウント作成";
    logoutButton.hidden = true;
    return;
  }

  currentUserLabel.textContent = `${currentUser.name}（${currentUser.email}）`;
  currentUserBio.textContent = currentUser.bio || "プロフィール設定から自己紹介を追加できます。";
  setAvatarElement(currentAvatar, currentUser);
  homeNavIcon.textContent = currentUser.homeIcon;
  accountButton.textContent = "アカウント";
  logoutButton.hidden = false;
}

function setAvatarElement(element, avatar) {
  element.innerHTML = "";
  element.style.background = avatar.avatarColor || "#2b2a27";

  if (avatar.avatarImage) {
    const image = document.createElement("img");
    image.src = avatar.avatarImage;
    image.alt = "";
    element.append(image);
    return;
  }

  element.textContent = avatar.avatarText || "G";
}

function getInitials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2);
}

function getPostUser(post) {
  return users.find((user) => user.email === post.ownerEmail);
}

function openProfileSettings() {
  if (!currentUser) {
    accountDialog.showModal();
    return;
  }

  profileNameInput.value = currentUser.name;
  profileBioInput.value = currentUser.bio;
  profileIconInput.value = currentUser.avatarText;
  selectedAvatarDataUrl = currentUser.avatarImage || "";
  avatarImageChanged = false;
  avatarImageInput.value = "";
  avatarZoomInput.value = "1";
  avatarXInput.value = "0";
  avatarYInput.value = "0";
  avatarSourceImage = null;
  drawAvatarPreview();
  homeIconInput.value = currentUser.homeIcon;
  selectedProfileColor = currentUser.avatarColor;
  swatches.forEach((swatch) => {
    swatch.classList.toggle("is-selected", swatch.dataset.color === selectedProfileColor);
  });
  profileDialog.showModal();
}

function drawAvatarPreview() {
  const context = avatarCanvas.getContext("2d");
  const size = avatarCanvas.width;

  context.clearRect(0, 0, size, size);
  context.save();
  context.beginPath();
  context.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  context.clip();
  context.fillStyle = selectedProfileColor;
  context.fillRect(0, 0, size, size);

  if (avatarSourceImage) {
    const zoom = Number(avatarZoomInput.value);
    const offsetX = Number(avatarXInput.value);
    const offsetY = Number(avatarYInput.value);
    const scale = Math.max(size / avatarSourceImage.width, size / avatarSourceImage.height) * zoom;
    const width = avatarSourceImage.width * scale;
    const height = avatarSourceImage.height * scale;
    const x = (size - width) / 2 + offsetX;
    const y = (size - height) / 2 + offsetY;
    context.drawImage(avatarSourceImage, x, y, width, height);
  } else if (selectedAvatarDataUrl) {
    const image = new Image();
    image.addEventListener("load", () => {
      avatarSourceImage = image;
      drawAvatarPreview();
    });
    image.src = selectedAvatarDataUrl;
  } else {
    context.fillStyle = "#fffaf2";
    context.font = "800 72px sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(profileIconInput.value.trim() || getInitials(profileNameInput.value.trim()) || "G", size / 2, size / 2);
  }

  context.restore();
}

function getEditedAvatarDataUrl() {
  if (!avatarSourceImage && !selectedAvatarDataUrl) {
    return "";
  }

  drawAvatarPreview();
  return avatarCanvas.toDataURL("image/png");
}

function renderPosts() {
  const visiblePosts = getVisiblePosts();

  feed.innerHTML = "";
  postCount.textContent = posts.length;
  emptyState.hidden = visiblePosts.length > 0;
  updateAccountView();

  visiblePosts.forEach((post) => {
    const card = postTemplate.content.firstElementChild.cloneNode(true);
    const avatar = card.querySelector(".timeline-avatar");
    const image = card.querySelector(".post-image");
    const title = card.querySelector("h3");
    const description = card.querySelector("p");
    const author = card.querySelector(".author");
    const time = card.querySelector(".time");
    const likeButton = card.querySelector(".like-button");
    const likeCount = card.querySelector(".like-count");
    const heart = card.querySelector(".heart");
    const boostButton = card.querySelector(".boost-button");
    const boostCount = card.querySelector(".boost-count");
    const shareButton = card.querySelector(".share-button");
    const reportButton = card.querySelector(".report-button");
    const hideButton = card.querySelector(".hide-button");
    const deleteButton = card.querySelector(".delete-button");
    const locationBox = card.querySelector(".post-location");
    const shopName = card.querySelector(".shop-name");
    const mapLink = card.querySelector(".map-link");
    const liked = currentUser ? post.likedBy.includes(currentUser.email) : false;
    const boosted = currentUser ? post.resharedBy.includes(currentUser.email) : false;
    const canDelete = currentUser && (post.ownerEmail === currentUser.email || currentUser.isAdmin);
    const postUser = getPostUser(post);

    setAvatarElement(avatar, {
      avatarText: postUser?.avatarText || post.authorAvatarText || getInitials(post.author),
      avatarColor: postUser?.avatarColor || post.authorAvatarColor || "#2b2a27",
      avatarImage: postUser?.avatarImage || post.authorAvatarImage || "",
    });
    image.src = post.image;
    image.alt = `${post.title}の写真`;
    title.textContent = post.title;
    description.textContent = post.description;
    author.textContent = `@${post.author}`;
    time.textContent = post.time;
    likeCount.textContent = post.likedBy.length;
    heart.textContent = liked ? "♥" : "♡";
    likeButton.classList.toggle("is-liked", liked);
    boostCount.textContent = post.resharedBy.length;
    boostButton.classList.toggle("is-boosted", boosted);
    deleteButton.hidden = !canDelete;
    hideButton.hidden = !currentUser?.isAdmin || post.hidden;
    reportButton.textContent = post.reports?.includes(currentUser?.email) ? "通報済み" : "通報";

    if (post.location?.enabled && (post.location.shopName || post.location.latitude)) {
      locationBox.hidden = false;
      shopName.textContent = post.location.shopName || "位置情報付き投稿";

      if (post.location.latitude && post.location.longitude) {
        mapLink.hidden = false;
        mapLink.href = `https://www.google.com/maps/search/?api=1&query=${post.location.latitude},${post.location.longitude}`;
      } else {
        mapLink.hidden = true;
      }
    }

    likeButton.addEventListener("click", () => toggleLike(post.id));
    boostButton.addEventListener("click", () => toggleBoost(post.id));
    shareButton.addEventListener("click", () => sharePost(post));
    reportButton.addEventListener("click", () => reportPost(post.id));
    hideButton.addEventListener("click", () => hidePost(post.id));
    deleteButton.addEventListener("click", () => deletePost(post.id));

    feed.append(card);
  });
}

async function toggleLike(postId) {
  if (!currentUser) {
    accountDialog.showModal();
    return;
  }

  posts = posts.map((post) => {
    if (post.id !== postId) {
      return post;
    }

    const liked = post.likedBy.includes(currentUser.email);
    return {
      ...post,
      likedBy: liked
        ? post.likedBy.filter((email) => email !== currentUser.email)
        : [...post.likedBy, currentUser.email],
    };
  });

  savePosts();
  renderPosts();
  await requestSharedPosts("toggleLike", {
    postId,
    email: currentUser.email,
  });
}

async function toggleBoost(postId) {
  if (!currentUser) {
    accountDialog.showModal();
    return;
  }

  posts = posts.map((post) => {
    if (post.id !== postId) {
      return post;
    }

    const boosted = post.resharedBy.includes(currentUser.email);
    return {
      ...post,
      resharedBy: boosted
        ? post.resharedBy.filter((email) => email !== currentUser.email)
        : [...post.resharedBy, currentUser.email],
    };
  });

  savePosts();
  renderPosts();
  await requestSharedPosts("toggleBoost", {
    postId,
    email: currentUser.email,
  });
}

async function sharePost(post) {
  const shareText = `ごはんログ: ${post.title}`;
  const shareUrl = location.href.split("#")[0];

  if (navigator.share) {
    await navigator.share({
      title: post.title,
      text: shareText,
      url: shareUrl,
    });
    return;
  }

  try {
    await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
    alert("共有用の文章をコピーしました。");
  } catch {
    alert(`${shareText}\n${shareUrl}`);
  }
}

async function deletePost(postId) {
  const post = posts.find((item) => item.id === postId);
  const canDelete = currentUser && post && (post.ownerEmail === currentUser.email || currentUser.isAdmin);

  if (!canDelete) {
    alert("この投稿は削除できません。投稿した本人だけが削除できます。");
    return;
  }

  posts = posts.filter((item) => item.id !== postId);
  savePosts();
  renderPosts();
  await requestSharedPosts("delete", {
    postId,
    email: currentUser.email,
    isAdmin: currentUser.isAdmin,
  });
}

async function reportPost(postId) {
  if (!currentUser) {
    accountDialog.showModal();
    return;
  }

  posts = posts.map((post) => {
    if (post.id !== postId) {
      return post;
    }

    const reports = post.reports || [];
    const nextReports = reports.includes(currentUser.email) ? reports : [...reports, currentUser.email];

    return {
      ...post,
      reports: nextReports,
      hidden: post.hidden || nextReports.length >= 3,
    };
  });
  savePosts();
  renderPosts();
  await requestSharedPosts("report", {
    postId,
    email: currentUser.email,
  });
}

async function hidePost(postId) {
  if (!currentUser?.isAdmin) {
    return;
  }

  posts = posts.map((post) => (post.id === postId ? { ...post, hidden: true } : post));
  savePosts();
  renderPosts();
  await requestSharedPosts("hide", {
    postId,
    isAdmin: currentUser.isAdmin,
  });
}

function getPostLocation() {
  if (!locationToggle.checked) {
    return null;
  }

  return {
    enabled: true,
    shopName: shopNameInput.value.trim(),
    latitude: selectedLocation?.latitude || null,
    longitude: selectedLocation?.longitude || null,
  };
}

function resetLocationForm() {
  selectedLocation = null;
  locationToggle.checked = false;
  locationFields.hidden = true;
  shopNameInput.value = "";
  locationStatus.textContent = "位置情報は未取得です。";
}

async function createPost(imageUrl) {
  if (!currentUser) {
    accountDialog.showModal();
    return;
  }

  const post = {
    id: crypto.randomUUID(),
    title: titleInput.value.trim(),
    description: descriptionInput.value.trim(),
    image: imageUrl,
    author: currentUser.name,
    ownerEmail: currentUser.email,
    authorAvatarText: currentUser.avatarText,
    authorAvatarColor: currentUser.avatarColor,
    authorAvatarImage: currentUser.avatarImage,
    time: "たった今",
    likedBy: [],
    resharedBy: [],
    reports: [],
    hidden: false,
    location: getPostLocation(),
  };

  posts = [post, ...posts];
  savePosts();
  postForm.reset();
  resetLocationForm();
  renderPosts();
  feed.scrollIntoView({ behavior: "smooth", block: "start" });
  await requestSharedPosts("create", { post });
}

postForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!currentUser) {
    accountDialog.showModal();
    return;
  }

  const file = photoInput.files[0];
  if (!file) {
    createPost("https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?auto=format&fit=crop&w=900&q=80");
    return;
  }

  const reader = new FileReader();
  reader.addEventListener("load", async () => {
    const imageUrl = await uploadSharedImage(reader.result);
    await createPost(imageUrl);
  });
  reader.readAsDataURL(file);
});

locationToggle.addEventListener("change", () => {
  locationFields.hidden = !locationToggle.checked;

  if (!locationToggle.checked) {
    selectedLocation = null;
    shopNameInput.value = "";
    locationStatus.textContent = "位置情報は未取得です。";
  }
});

getLocationButton.addEventListener("click", () => {
  if (!navigator.geolocation) {
    locationStatus.textContent = "このブラウザでは位置情報を取得できません。";
    return;
  }

  locationStatus.textContent = "現在地を取得しています...";
  navigator.geolocation.getCurrentPosition(
    (position) => {
      selectedLocation = {
        latitude: Number(position.coords.latitude.toFixed(6)),
        longitude: Number(position.coords.longitude.toFixed(6)),
      };
      locationStatus.textContent = `取得済み: ${selectedLocation.latitude}, ${selectedLocation.longitude}`;
    },
    () => {
      selectedLocation = null;
      locationStatus.textContent = "位置情報を取得できませんでした。許可設定を確認してください。";
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000,
    },
  );
});

accountForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const email = emailInput.value.trim().toLowerCase();
  const existingUser = users.find((user) => user.email === email);

  if (existingUser && existingUser.password !== passwordInput.value) {
    alert("このメールアドレスは登録済みです。パスワードが違います。");
    return;
  }

  currentUser =
    existingUser ||
    normalizeUser({
      name: nameInput.value.trim(),
      email,
      password: passwordInput.value,
      isAdmin: users.length === 0,
    });

  if (!existingUser) {
    users = [...users, currentUser];
    saveUsers();
  }

  saveSession();
  accountForm.reset();
  accountDialog.close();
  renderPosts();
});

focusPostButton.addEventListener("click", () => {
  titleInput.focus();
  postForm.scrollIntoView({ behavior: "smooth", block: "center" });
});

accountButton.addEventListener("click", () => {
  if (currentUser) {
    openProfileSettings();
    return;
  }

  accountDialog.showModal();
});

closeAccountButton.addEventListener("click", () => {
  accountDialog.close();
});

closeProfileButton.addEventListener("click", () => {
  profileDialog.close();
});

swatches.forEach((swatch) => {
  swatch.addEventListener("click", () => {
    selectedProfileColor = swatch.dataset.color;
    swatches.forEach((item) => item.classList.toggle("is-selected", item === swatch));
    drawAvatarPreview();
  });
});

avatarImageInput.addEventListener("change", () => {
  const file = avatarImageInput.files[0];

  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    const image = new Image();
    image.addEventListener("load", () => {
      avatarSourceImage = image;
      selectedAvatarDataUrl = reader.result;
      avatarImageChanged = true;
      drawAvatarPreview();
    });
    image.src = reader.result;
  });
  reader.readAsDataURL(file);
});

[avatarZoomInput, avatarXInput, avatarYInput, profileIconInput, profileNameInput].forEach((input) => {
  input.addEventListener("input", drawAvatarPreview);
});

profileForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!currentUser) {
    profileDialog.close();
    accountDialog.showModal();
    return;
  }

  const editedAvatar = avatarImageChanged ? getEditedAvatarDataUrl() : "";
  const avatarImage = editedAvatar ? await uploadSharedImage(editedAvatar) : currentUser.avatarImage;

  currentUser = normalizeUser({
    ...currentUser,
    name: profileNameInput.value.trim(),
    bio: profileBioInput.value.trim(),
    avatarText: profileIconInput.value.trim() || getInitials(profileNameInput.value.trim()),
    avatarColor: selectedProfileColor,
    avatarImage,
    homeIcon: homeIconInput.value,
  });

  users = users.map((user) => (user.email === currentUser.email ? currentUser : user));
  posts = posts.map((post) =>
    post.ownerEmail === currentUser.email
      ? {
          ...post,
          author: currentUser.name,
          authorAvatarText: currentUser.avatarText,
          authorAvatarColor: currentUser.avatarColor,
          authorAvatarImage: currentUser.avatarImage,
        }
      : post,
  );
  saveUsers();
  saveSession();
  savePosts();
  profileDialog.close();
  renderPosts();
  await requestSharedPosts("updateAuthor", {
    email: currentUser.email,
    name: currentUser.name,
    avatarText: currentUser.avatarText,
    avatarColor: currentUser.avatarColor,
    avatarImage: currentUser.avatarImage,
  });
});

logoutButton.addEventListener("click", () => {
  currentUser = null;
  saveSession();
  renderPosts();
});

navButtons.forEach((button) => {
  button.addEventListener("click", () => {
    navButtons.forEach((item) => item.classList.toggle("is-active", item === button));

    if (button.dataset.nav === "home") {
      currentView = "timeline";
      feedTitle.textContent = "タイムライン";
      tabButtons.forEach((item) => item.classList.toggle("is-active", item.dataset.view === "timeline"));
      searchInput.value = "";
      renderPosts();
      feed.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    if (button.dataset.nav === "search") {
      currentView = "search";
      feedTitle.textContent = "検索結果";
      tabButtons.forEach((item) => item.classList.toggle("is-active", item.dataset.view === "search"));
      searchInput.focus();
      renderPosts();
      return;
    }

    if (button.dataset.nav === "liked") {
      currentView = "liked";
      feedTitle.textContent = "いいねした投稿";
      tabButtons.forEach((item) => item.classList.toggle("is-active", item.dataset.view === "liked"));
      renderPosts();
      return;
    }

    openProfileSettings();
  });
});

searchInput.addEventListener("input", () => {
  if (searchInput.value.trim()) {
    currentView = "search";
    feedTitle.textContent = "検索結果";
    tabButtons.forEach((button) => button.classList.toggle("is-active", button.dataset.view === "search"));
  }
  renderPosts();
});

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    currentView = button.dataset.view;
    tabButtons.forEach((item) => item.classList.toggle("is-active", item === button));
    feedTitle.textContent =
      currentView === "timeline" ? "タイムライン" : currentView === "liked" ? "いいねした投稿" : "検索結果";
    renderPosts();
  });
});

renderPosts();
loadSharedPosts();
