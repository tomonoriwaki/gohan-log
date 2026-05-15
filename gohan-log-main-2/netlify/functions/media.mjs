import { getStore } from "@netlify/blobs";

const store = getStore("gohan-log-media");

function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function parseDataUrl(dataUrl) {
  const match = dataUrl.match(/^data:(.+);base64,(.+)$/);

  if (!match) {
    return null;
  }

  return {
    mimeType: match[1],
    base64: match[2],
  };
}

export default async (request) => {
  const url = new URL(request.url);

  if (request.method === "GET") {
    const id = url.searchParams.get("id");

    if (!id) {
      return json({ error: "Missing image id" }, 400);
    }

    const image = await store.get(id, { type: "json", consistency: "strong" });

    if (!image) {
      return json({ error: "Image not found" }, 404);
    }

    const bytes = Uint8Array.from(atob(image.base64), (char) => char.charCodeAt(0));
    return new Response(bytes, {
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Type": image.mimeType,
      },
    });
  }

  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const body = await request.json();
  const image = parseDataUrl(body.dataUrl || "");

  if (!image) {
    return json({ error: "Invalid image data" }, 400);
  }

  const id = crypto.randomUUID();
  await store.setJSON(id, image);

  return json({
    id,
    url: `/.netlify/functions/media?id=${id}`,
  });
};
