const windows = new Map();

export async function onRequestPost({ request, env }) {
  try {
    const key = env.GROQ_API_KEY;
    if (!key) {
      return json({ error: "Groq ещё не подключён: добавь GROQ_API_KEY в секреты проекта." }, 503);
    }

    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const now = Date.now();
    const recent = (windows.get(ip) || []).filter(t => now - t < 60_000);
    if (recent.length >= 10) {
      return json({ error: "Слишком много запросов подряд. Подожди минуту." }, 429);
    }
    recent.push(now);
    windows.set(ip, recent);

    const body = await request.json();
    if (typeof body.prompt !== "string" || !body.prompt.trim()) {
      return json({ error: "Не получен контекст ролевой сцены." }, 400);
    }
    if (body.prompt.length > 18000) {
      return json({ error: "Слишком большой контекст переписки. Начни новый чат или сократи историю." }, 413);
    }

    const upstream = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: env.GROQ_MODEL || "openai/gpt-oss-20b",
        messages: [
          {
            role: "system",
            content: "Ты — актёр ролевой игры. Пиши только на русском языке. Следуй карточке выбранного персонажа и контексту сцены. Сохраняй характер, канон, отношения и последовательность событий. Не управляй персонажем пользователя: не придумывай за него реплики, мысли или действия. Развивай сцену естественно, отвечай живо и не слишком длинно. Не выходи из роли. Соблюдай безопасный неэксплицитный формат; несовершеннолетних персонажей не сексуализируй."
          },
          { role: "user", content: body.prompt }
        ],
        max_tokens: 1000,
        temperature: 0.85
      })
    });

    const result = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const status = upstream.status === 429 ? 429 : 502;
      return json({
        error: status === 429
          ? "У Groq закончился лимит запросов. Попробуй немного позже."
          : "Groq временно не смог ответить. Попробуй ещё раз."
      }, status);
    }
    const text = result.choices?.[0]?.message?.content || "";
    return json({ text });
  } catch (error) {
    return json({ error: "Не удалось получить ответ ИИ. Попробуй ещё раз." }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}
