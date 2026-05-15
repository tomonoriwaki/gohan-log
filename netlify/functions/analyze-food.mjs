const OPENAI_API_URL = "https://api.openai.com/v1/responses";

function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function extractJson(text) {
  const match = text.match(/\{[\s\S]*\}/);

  if (!match) {
    return null;
  }

  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

export default async (request) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return json(
      {
        passed: false,
        reason: "OPENAI_API_KEY が未設定です。Netlifyの環境変数に設定すると、料理写真のAI判定が有効になります。",
      },
      503,
    );
  }

  const { dataUrl } = await request.json();

  if (!dataUrl || !dataUrl.startsWith("data:image/")) {
    return json({ passed: false, reason: "画像データが正しくありません。" }, 400);
  }

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_VISION_MODEL || "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                "この画像が料理・飲み物・食事風景として投稿に適切か判定してください。人物だけ、風景だけ、書類、スクリーンショット、暴力的/性的/違法な内容、料理と無関係な画像は不適切です。JSONだけで返してください: {\"passed\": boolean, \"confidence\": number, \"reason\": string}",
            },
            {
              type: "input_image",
              image_url: dataUrl,
              detail: "low",
            },
          ],
        },
      ],
      temperature: 0,
    }),
  });

  if (!response.ok) {
    return json({ passed: false, reason: "AI判定サービスでエラーが発生しました。" }, 502);
  }

  const result = await response.json();
  const parsed = extractJson(result.output_text || "");

  if (!parsed) {
    return json({ passed: false, reason: "AI判定結果を読み取れませんでした。" }, 502);
  }

  const confidence = Number(parsed.confidence || 0);
  const passed = Boolean(parsed.passed) && confidence >= 0.62;

  return json({
    passed,
    confidence,
    reason: passed ? "料理写真として確認できました。" : parsed.reason || "料理写真として確認できませんでした。",
  });
};
