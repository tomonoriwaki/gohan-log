const POSTS_KEY = "mogu-log-posts-v4";
const SESSION_KEY = "mogu-log-session-v1";
const SOUND_KEY = "mogu-log-sound-enabled-v1";
const CHROME_KEY = "mogu-log-chrome-hidden-v1";
const SAVED_POSTS_KEY = "mogu-log-saved-posts-v1";
const PROFILE_KEY = "mogu-log-profile-v1";
const SAMPLE_POST_KEY = "mogu-log-profile-sample-post-v1";
const POSTS_API = "/.netlify/functions/posts";
const MEDIA_API = "/.netlify/functions/media";
const FOOD_CHECK_API = "/.netlify/functions/analyze-food";
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
  overlayTextInput: document.querySelector("#overlayTextInput"),
  stampSelect: document.querySelector("#stampSelect"),
  rotateButton: document.querySelector("#rotateButton"),
  resetImageButton: document.querySelector("#resetImageButton"),
  searchInput: document.querySelector("#searchInput"),
  searchBox: document.querySelector("#searchBox"),
  categoryToggle: document.querySelector("#categoryToggle"),
  categoryMenu: document.querySelector("#categoryMenu"),
  feed: document.querySelector("#feed"),
  feedModeLabel: document.querySelector("#feedModeLabel"),
  feedTitle: document.querySelector("#feedTitle"),
  rankingButton: document.querySelector("#rankingButton"),
  timelineButton: document.querySelector("#timelineButton"),
  postTemplate: document.querySelector("#postTemplate"),
  postCount: document.querySelector("#postCount"),
  noticeList: document.querySelector("#noticeList"),
  noticeCrownGauge: document.querySelector("#noticeCrownGauge"),
  noticeCrownText: document.querySelector("#noticeCrownText"),
  noticeCrownHint: document.querySelector("#noticeCrownHint"),
  profileForm: document.querySelector("#profileForm"),
  profileNameInput: document.querySelector("#profileNameInput"),
  profileHandleInput: document.querySelector("#profileHandleInput"),
  profileBioInput: document.querySelector("#profileBioInput"),
  profileAreaInput: document.querySelector("#profileAreaInput"),
  profileFoodInput: document.querySelector("#profileFoodInput"),
  profileNamePreview: document.querySelector("#profileNamePreview"),
  profileBioPreview: document.querySelector("#profileBioPreview"),
  profileAreaTag: document.querySelector("#profileAreaTag"),
  profileFoodTag: document.querySelector("#profileFoodTag"),
  profileAvatar: document.querySelector("#profileAvatar"),
  profileRoyalBadge: document.querySelector("#profileRoyalBadge"),
  profileStats: document.querySelector("#profileStats"),
  likesGauge: document.querySelector("#likesGauge"),
  likesGaugeText: document.querySelector("#likesGaugeText"),
  boostGauge: document.querySelector("#boostGauge"),
  boostGaugeText: document.querySelector("#boostGaugeText"),
  crownGauge: document.querySelector("#crownGauge"),
  crownGaugeText: document.querySelector("#crownGaugeText"),
  savedPosts: document.querySelector("#savedPosts"),
  savedPostsEmpty: document.querySelector("#savedPostsEmpty"),
  myPosts: document.querySelector("#myPosts"),
  myPostsEmpty: document.querySelector("#myPostsEmpty"),
  emptyState: document.querySelector("#emptyState"),
};

let posts = loadPosts();
let savedPostIds = loadSavedPostIds();
let profile = loadProfile();
let sourceImage = null;
let imageRotation = 0;
let soundEnabled = localStorage.getItem(SOUND_KEY) === "true";
let audioContext = null;
let selectedLocation = null;
let rankingMode = false;
let activePage = "feed";

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
    comments: Array.isArray(post.comments) ? post.comments : [],
    reportedBy: Array.isArray(post.reportedBy) ? post.reportedBy : [],
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

function ensureSampleProfilePost() {
  if (localStorage.getItem(SAMPLE_POST_KEY) === "true") {
    return;
  }

  const samplePost = normalizePost({
    id: crypto.randomUUID(),
    title: "週末に食べた特製ラーメン",
    description: "濃厚だけど重すぎないスープで、味玉までしっかりおいしかった一杯。次は焼き餃子も一緒に頼みたい。",
    image: "https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?auto=format&fit=crop&w=900&q=80",
    author: profile.handle || "mogu",
    ownerEmail: sessionId,
    time: "サンプル投稿",
    likedBy: ["sample-like-1", "sample-like-2", "sample-like-3"],
    resharedBy: ["sample-boost-1"],
    comments: [
      { id: crypto.randomUUID(), author: "ramen_fan", text: "味玉が最高そうです。", time: "サンプル" },
    ],
    reportedBy: [],
    location: { enabled: true, shopName: profile.area || "お気に入りのラーメン屋", latitude: null, longitude: null },
  });

  posts = [samplePost, ...posts];
  savePosts();
  localStorage.setItem(SAMPLE_POST_KEY, "true");
}

function loadSavedPostIds() {
  try {
    const savedIds = JSON.parse(localStorage.getItem(SAVED_POSTS_KEY) || "[]");
    return Array.isArray(savedIds) ? savedIds : [];
  } catch {
    return [];
  }
}

function saveSavedPostIds() {
  localStorage.setItem(SAVED_POSTS_KEY, JSON.stringify(savedPostIds));
}

function loadProfile() {
  const fallback = {
    name: "もぐ",
    handle: "mogu",
    bio: "おいしかったものを気軽に残しています。",
    area: "",
    food: "",
  };

  try {
    return { ...fallback, ...JSON.parse(localStorage.getItem(PROFILE_KEY) || "{}") };
  } catch {
    return fallback;
  }
}

function saveProfile() {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
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

async function checkFoodImage(dataUrl) {
  if (!CAN_USE_SHARED_POSTS) {
    return { passed: true, reason: "ローカル確認ではAI判定をスキップします。" };
  }

  try {
    const response = await fetch(FOOD_CHECK_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dataUrl }),
    });
    const result = await response.json();

    if (!response.ok) {
      return {
        passed: false,
        reason: result.reason || "AI判定の準備ができていないため、投稿できません。",
      };
    }

    return result;
  } catch (error) {
    console.warn("料理写真のAI判定に失敗しました。", error);
    return { passed: false, reason: "AI判定に失敗しました。少し待ってからもう一度お試しください。" };
  }
}

function getFilteredPosts() {
  const keyword = elements.searchInput.value.trim().toLowerCase();
  const availablePosts = posts.filter((post) => post.reportedBy.length < 3);

  const visiblePosts = !keyword
    ? [...availablePosts]
    : availablePosts.filter((post) => {
        const text = `${post.title} ${post.description} ${post.author} ${post.location?.shopName || ""}`.toLowerCase();
        return text.includes(keyword);
      });

  if (!rankingMode) {
    return visiblePosts;
  }

  return visiblePosts.sort((a, b) => {
    const likeDiff = b.likedBy.length - a.likedBy.length;
    return likeDiff || posts.indexOf(a) - posts.indexOf(b);
  });
}

function renderModeControls() {
  if (activePage === "search") {
    elements.feedModeLabel.textContent = "Search";
    elements.feedTitle.textContent = "検索";
  } else {
    elements.feedModeLabel.textContent = rankingMode ? "Ranking" : "Timeline";
    elements.feedTitle.textContent = rankingMode ? "いいねランキング" : "投稿一覧";
  }

  elements.rankingButton.classList.toggle("is-active", rankingMode);
  elements.rankingButton.textContent = rankingMode ? "ランキング表示中" : "ランキングを見る";
}

function renderNotices() {
  const myPosts = posts.filter((post) => post.ownerEmail === sessionId);
  const totalLikes = myPosts.reduce((sum, post) => sum + post.likedBy.length, 0);
  const totalBoosts = myPosts.reduce((sum, post) => sum + post.resharedBy.length, 0);
  const crownScore = totalLikes + totalBoosts * 2;
  const popularPosts = [...posts]
    .filter((post) => post.likedBy.length > 0)
    .sort((a, b) => b.likedBy.length - a.likedBy.length)
    .slice(0, 3);
  const recentComments = [...posts]
    .flatMap((post) => post.comments.map((comment) => ({ ...comment, postTitle: post.title })))
    .slice(-3)
    .reverse();
  const savedPosts = savedPostIds.map((id) => posts.find((post) => post.id === id)).filter(Boolean).slice(0, 2);

  elements.noticeList.innerHTML = "";
  updateGauge(elements.noticeCrownGauge, elements.noticeCrownText, crownScore, 10);
  elements.noticeCrownHint.textContent =
    crownScore >= 10
      ? "王冠ユーザーです。プロフィールと投稿カードで目立つ表示になります。"
      : `あと${10 - crownScore}ポイントで王冠ユーザーです。いいねは1pt、リツイートは2ptです。`;

  const notices = [
    ...popularPosts.map((post) => ({
      icon: "♡",
      title: `${post.title} にいいね`,
      body: `${post.likedBy.length}件のいいねが集まっています。`,
    })),
    ...recentComments.map((comment) => ({
      icon: "💬",
      title: `${comment.postTitle} にコメント`,
      body: `@${comment.author}: ${comment.text}`,
    })),
    ...savedPosts.map((post) => ({
      icon: "🔖",
      title: "保存した投稿",
      body: post.title,
    })),
  ];

  if (notices.length === 0) {
    const emptyNotice = document.createElement("p");
    emptyNotice.className = "notice-item";
    emptyNotice.textContent = "まだ通知はありません。いいね、コメント、保存が増えるとここに表示されます。";
    elements.noticeList.append(emptyNotice);
    return;
  }

  notices.slice(0, 7).forEach((item) => {
    const notice = document.createElement("article");
    notice.className = "notice-item";
    notice.innerHTML = `<span>${item.icon}</span><div><strong>${item.title}</strong><p>${item.body}</p></div>`;
    elements.noticeList.append(notice);
  });
}

function renderProfileStats() {
  const myPosts = posts.filter((post) => post.ownerEmail === sessionId);
  const totalLikes = myPosts.reduce((sum, post) => sum + post.likedBy.length, 0);
  const totalBoosts = myPosts.reduce((sum, post) => sum + post.resharedBy.length, 0);
  const royal = getRoyalStatus(totalLikes, totalBoosts);
  const crownScore = totalLikes + totalBoosts * 2;
  elements.profileNamePreview.textContent = `${profile.name} / @${profile.handle}`;
  elements.profileBioPreview.textContent = profile.bio;
  elements.profileAreaTag.textContent = profile.area ? `エリア: ${profile.area}` : "エリア未設定";
  elements.profileFoodTag.textContent = profile.food ? `好き: ${profile.food}` : "ジャンル未設定";
  elements.profileStats.textContent = `自分の投稿 ${myPosts.length}件 / もらったいいね ${totalLikes}件 / リツイート ${totalBoosts}件 / 保存 ${savedPostIds.length}件`;
  elements.profileAvatar.textContent = royal.hasCrown ? "王" : "も";
  elements.profileAvatar.classList.toggle("is-royal", royal.hasCrown);
  elements.profileRoyalBadge.textContent = royal.label;
  elements.profileRoyalBadge.classList.toggle("is-royal", royal.hasCrown);
  updateGauge(elements.likesGauge, elements.likesGaugeText, totalLikes, 5);
  updateGauge(elements.boostGauge, elements.boostGaugeText, totalBoosts, 3);
  updateGauge(elements.crownGauge, elements.crownGaugeText, crownScore, 10);
}

function updateGauge(bar, label, value, max) {
  const percent = Math.min(100, Math.round((value / max) * 100));
  bar.style.width = `${percent}%`;
  label.textContent = `${value} / ${max}`;
}

function getRoyalStatus(likes, boosts) {
  const score = likes + boosts * 2;

  if (score >= 10) {
    return { hasCrown: true, label: "王冠ユーザー" };
  }

  if (score >= 5) {
    return { hasCrown: true, label: "注目ユーザー" };
  }

  return { hasCrown: false, label: `王冠まであと${5 - score}ポイント` };
}

function createPostCard(post, options = {}) {
  const card = elements.postTemplate.content.firstElementChild.cloneNode(true);
    const image = card.querySelector(".post-image");
    const title = card.querySelector("h3");
    const description = card.querySelector("p");
    const author = card.querySelector(".author");
    const time = card.querySelector(".time");
    const royalBadge = card.querySelector(".post-royal-badge");
    const likeButton = card.querySelector(".like-button");
    const heart = card.querySelector(".heart");
    const likeCount = card.querySelector(".like-count");
    const boostButton = card.querySelector(".boost-button");
    const boostCount = card.querySelector(".boost-count");
    const shareButton = card.querySelector(".share-button");
    const saveButton = card.querySelector(".save-button");
    const reportButton = card.querySelector(".report-button");
    const deleteButton = card.querySelector(".delete-button");
    const commentList = card.querySelector(".comment-list");
    const commentForm = card.querySelector(".comment-form");
    const commentInput = card.querySelector(".comment-input");
    const locationBox = card.querySelector(".post-location");
    const shopName = card.querySelector(".shop-name");
    const mapLink = card.querySelector(".map-link");
    const liked = post.likedBy.includes(sessionId);
    const boosted = post.resharedBy.includes(sessionId);
    const saved = savedPostIds.includes(post.id);
    const reported = post.reportedBy.includes(sessionId);
    const postRoyal = getRoyalStatus(post.likedBy.length, post.resharedBy.length);

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
    saveButton.textContent = saved ? "保存済み" : "保存";
    saveButton.classList.toggle("is-saved", saved);
    reportButton.textContent = reported ? `通報済み ${post.reportedBy.length}` : `通報 ${post.reportedBy.length}`;
    reportButton.disabled = reported;
    royalBadge.hidden = !postRoyal.hasCrown;
    royalBadge.textContent = postRoyal.label;

    commentList.innerHTML = "";
    post.comments.slice(-3).forEach((comment) => {
      const commentItem = document.createElement("p");
      commentItem.className = "comment-item";
      commentItem.textContent = `@${comment.author}: ${comment.text}`;
      commentList.append(commentItem);
    });

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
    saveButton.addEventListener("click", () => toggleSave(post.id));
    reportButton.addEventListener("click", () => reportPost(post.id));
    deleteButton.addEventListener("click", () => deletePost(post.id));
    commentForm.addEventListener("submit", (event) => addComment(event, post.id, commentInput));

  if (options.compact) {
    card.classList.add("is-compact");
  }

  return card;
}

function renderProfileCollections() {
  const savedPosts = savedPostIds.map((id) => posts.find((post) => post.id === id)).filter(Boolean);
  const myPosts = posts.filter((post) => post.ownerEmail === sessionId);

  elements.savedPosts.innerHTML = "";
  elements.myPosts.innerHTML = "";
  elements.savedPostsEmpty.hidden = savedPosts.length > 0;
  elements.myPostsEmpty.hidden = myPosts.length > 0;

  savedPosts.forEach((post) => {
    elements.savedPosts.append(createPostCard(post, { compact: true }));
  });

  myPosts.forEach((post) => {
    elements.myPosts.append(createPostCard(post, { compact: true }));
  });
}

function renderProfileForm() {
  elements.profileNameInput.value = profile.name;
  elements.profileHandleInput.value = profile.handle;
  elements.profileBioInput.value = profile.bio;
  elements.profileAreaInput.value = profile.area;
  elements.profileFoodInput.value = profile.food;
}

function renderPosts() {
  const visiblePosts = getFilteredPosts();

  elements.feed.innerHTML = "";
  elements.postCount.textContent = posts.length;
  elements.emptyState.hidden = visiblePosts.length > 0;
  renderModeControls();
  renderNotices();
  renderProfileStats();
  renderProfileCollections();

  visiblePosts.forEach((post) => {
    const card = createPostCard(post);
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

function toggleSave(postId) {
  savedPostIds = savedPostIds.includes(postId)
    ? savedPostIds.filter((id) => id !== postId)
    : [postId, ...savedPostIds];

  saveSavedPostIds();
  renderPosts();
  playSound("tap");
}

function addComment(event, postId, input) {
  event.preventDefault();
  const text = input.value.trim();

  if (!text) {
    return;
  }

  posts = posts.map((post) => {
    if (post.id !== postId) {
      return post;
    }

    return {
      ...post,
      comments: [
        ...post.comments,
        {
          id: crypto.randomUUID(),
          author: profile.handle || "mogu",
          text,
          time: "いま",
        },
      ],
    };
  });

  savePosts();
  input.value = "";
  renderPosts();
  playSound("tap");
}

function reportPost(postId) {
  posts = posts.map((post) => {
    if (post.id !== postId || post.reportedBy.includes(sessionId)) {
      return post;
    }

    return {
      ...post,
      reportedBy: [...post.reportedBy, sessionId],
    };
  });

  savePosts();
  renderPosts();
  playSound("delete");
  alert("通報を受け付けました。通報が3件集まった投稿は自動で非表示になります。");
}

function updateProfile(event) {
  event.preventDefault();

  profile = {
    name: elements.profileNameInput.value.trim() || "もぐ",
    handle: elements.profileHandleInput.value.trim().replace(/^@/, "") || "mogu",
    bio: elements.profileBioInput.value.trim() || "おいしかったものを気軽に残しています。",
    area: elements.profileAreaInput.value.trim(),
    food: elements.profileFoodInput.value.trim(),
  };

  saveProfile();
  renderPosts();
  playSound("tap");
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
  const canvas = elements.previewCanvas;
  const context = canvas.getContext("2d");

  if (!sourceImage) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#fff2ea";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#ee786f";
    context.font = "900 54px system-ui, sans-serif";
    context.textAlign = "center";
    context.fillText("写真を選ぶとここで編集できます", canvas.width / 2, canvas.height / 2 - 18);
    context.fillStyle = "#71685f";
    context.font = "700 30px system-ui, sans-serif";
    context.fillText("文字入れ・スタンプ・色味調整OK", canvas.width / 2, canvas.height / 2 + 36);
    context.textAlign = "left";
    return;
  }

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

  context.globalCompositeOperation = "source-over";
  const overlayText = elements.overlayTextInput.value.trim();
  if (overlayText) {
    context.font = "900 58px system-ui, sans-serif";
    context.textBaseline = "bottom";
    context.lineJoin = "round";
    context.strokeStyle = "rgba(36, 32, 28, 0.56)";
    context.lineWidth = 14;
    context.strokeText(overlayText, 44, canvas.height - 42);
    context.fillStyle = "#fffaf2";
    context.fillText(overlayText, 44, canvas.height - 42);
  }

  if (elements.stampSelect.value) {
    context.font = "900 88px system-ui, sans-serif";
    context.textAlign = "right";
    context.textBaseline = "top";
    context.fillText(elements.stampSelect.value, canvas.width - 42, 34);
    context.textAlign = "left";
  }

  context.restore();
}

function resetImageControls() {
  elements.brightnessInput.value = "100";
  elements.contrastInput.value = "105";
  elements.saturationInput.value = "110";
  elements.warmthInput.value = "10";
  elements.overlayTextInput.value = "";
  elements.stampSelect.value = "";
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

  if (dataUrl) {
    const foodCheck = await checkFoodImage(dataUrl);

    if (!foodCheck.passed) {
      alert(foodCheck.reason || "料理の写真として確認できませんでした。料理がはっきり写った写真を選んでください。");
      return;
    }
  }

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
    comments: [],
    reportedBy: [],
    location: getPostLocation(),
  });

  posts = [post, ...posts];
  savePosts();
  elements.postForm.reset();
  sourceImage = null;
  imageRotation = 0;
  drawPreview();
  resetLocationForm();
  renderPosts();
  playSound("post");
  switchPage("feed");
  await requestSharedPosts("create", { post });
}

function setSoundEnabled(enabled) {
  soundEnabled = enabled;
  localStorage.setItem(SOUND_KEY, String(enabled));
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

function switchPage(page) {
  activePage = page;

  document.querySelectorAll(".page-section").forEach((section) => {
    const pages = section.dataset.page.split(" ");
    section.classList.toggle("is-active-page", pages.includes(page));
  });

  syncNavigation(page);
  renderPosts();
  window.scrollTo({ top: 0, behavior: "auto" });

  if (page === "search") {
    elements.searchInput.focus();
  }
}

function toggleCategoryMenu() {
  const open = elements.categoryMenu.hidden;
  elements.categoryMenu.hidden = !open;
  elements.categoryToggle.setAttribute("aria-expanded", String(open));
}

function selectCategory(category) {
  elements.searchInput.value = category;
  elements.categoryMenu.hidden = true;
  elements.categoryToggle.setAttribute("aria-expanded", "false");
  rankingMode = false;
  switchPage("search");
  renderPosts();
  playSound("tap");
}

function showRanking() {
  rankingMode = true;
  switchPage("feed");
  playSound("tap");
}

function showTimeline() {
  rankingMode = false;
  switchPage("feed");
  playSound("tap");
}

elements.postForm.addEventListener("submit", createPost);

elements.photoInput.addEventListener("change", () => {
  const file = elements.photoInput.files[0];

  if (file) {
    readImageFile(file);
  }
});

[elements.brightnessInput, elements.contrastInput, elements.saturationInput, elements.warmthInput, elements.overlayTextInput, elements.stampSelect].forEach((input) => {
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
elements.categoryToggle.addEventListener("click", toggleCategoryMenu);
elements.categoryMenu.querySelectorAll("[data-category]").forEach((button) => {
  button.addEventListener("click", () => selectCategory(button.dataset.category));
});
elements.rankingButton.addEventListener("click", showRanking);
elements.timelineButton.addEventListener("click", showTimeline);
elements.profileForm.addEventListener("submit", updateProfile);

elements.focusPostButton.addEventListener("click", () => {
  switchPage("composer");
  elements.titleInput.focus();
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

elements.soundTogglePanel.addEventListener("change", () => setSoundEnabled(elements.soundTogglePanel.checked));

document.querySelectorAll(".nav-button").forEach((button) => {
  button.addEventListener("click", () => {
    const jump = button.dataset.jump;

    if (jump === "feed") {
      rankingMode = false;
    }

    switchPage(jump);
    playSound("tap");
  });
});

elements.soundTogglePanel.checked = soundEnabled;
renderProfileForm();
ensureSampleProfilePost();
drawPreview();
setChromeHidden(localStorage.getItem(CHROME_KEY) === "true");
renderPosts();
switchPage("feed");
requestSharedPosts();

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("service-worker.js").catch((error) => {
    console.warn("アプリ化用のService Worker登録に失敗しました。", error);
  });
}
