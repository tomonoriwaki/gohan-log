import { getStore } from "@netlify/blobs";

const store = getStore("gohan-log");
const POSTS_KEY = "posts";

function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

async function readPosts() {
  return (await store.get(POSTS_KEY, { type: "json", consistency: "strong" })) || [];
}

async function writePosts(posts) {
  await store.setJSON(POSTS_KEY, posts);
  return posts;
}

export default async (request) => {
  if (request.method === "GET") {
    return json({ posts: await readPosts() });
  }

  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const body = await request.json();
  const posts = await readPosts();

  if (body.action === "create") {
    const nextPosts = [body.post, ...posts.filter((post) => post.id !== body.post.id)];
    return json({ posts: await writePosts(nextPosts) });
  }

  if (body.action === "toggleLike") {
    const nextPosts = posts.map((post) => {
      if (post.id !== body.postId) {
        return post;
      }

      const likedBy = post.likedBy || [];
      const liked = likedBy.includes(body.email);
      return {
        ...post,
        likedBy: liked ? likedBy.filter((email) => email !== body.email) : [...likedBy, body.email],
      };
    });

    return json({ posts: await writePosts(nextPosts) });
  }

  if (body.action === "toggleBoost") {
    const nextPosts = posts.map((post) => {
      if (post.id !== body.postId) {
        return post;
      }

      const resharedBy = post.resharedBy || [];
      const reshared = resharedBy.includes(body.email);
      return {
        ...post,
        resharedBy: reshared ? resharedBy.filter((email) => email !== body.email) : [...resharedBy, body.email],
      };
    });

    return json({ posts: await writePosts(nextPosts) });
  }

  if (body.action === "report") {
    const nextPosts = posts.map((post) => {
      if (post.id !== body.postId) {
        return post;
      }

      const reports = post.reports || [];
      const alreadyReported = reports.includes(body.email);
      const nextReports = alreadyReported ? reports : [...reports, body.email];

      return {
        ...post,
        reports: nextReports,
        hidden: post.hidden || nextReports.length >= 3,
      };
    });

    return json({ posts: await writePosts(nextPosts) });
  }

  if (body.action === "hide") {
    if (!body.isAdmin) {
      return json({ error: "管理者だけが非表示にできます。" }, 403);
    }

    const nextPosts = posts.map((post) =>
      post.id === body.postId ? { ...post, hidden: true } : post,
    );

    return json({ posts: await writePosts(nextPosts) });
  }

  if (body.action === "delete") {
    const post = posts.find((item) => item.id === body.postId);

    if (!post || (post.ownerEmail !== body.email && !body.isAdmin)) {
      return json({ error: "この投稿は削除できません。" }, 403);
    }

    return json({ posts: await writePosts(posts.filter((item) => item.id !== body.postId)) });
  }

  if (body.action === "updateAuthor") {
    const nextPosts = posts.map((post) =>
      post.ownerEmail === body.email
        ? {
            ...post,
            author: body.name,
            authorAvatarText: body.avatarText,
            authorAvatarColor: body.avatarColor,
            authorAvatarImage: body.avatarImage,
          }
        : post,
    );

    return json({ posts: await writePosts(nextPosts) });
  }

  return json({ error: "Unknown action" }, 400);
};
