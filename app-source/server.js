import express from "express";
import OpenAI from "openai";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();
const root = path.dirname(fileURLToPath(import.meta.url));
app.use(express.json({ limit: "15mb" }));
app.use(express.static(path.join(root, "public")));

const inviteCode = process.env.INVITE_CODE || "";
const apiKey = process.env.AI_API_KEY || "";
const client = apiKey ? new OpenAI({
  apiKey,
  baseURL: process.env.AI_BASE_URL || "https://api.groq.com/openai/v1"
}) : null;

app.get("/api/status", (_req, res) => res.json({ online: true, aiConfigured: Boolean(client) }));
app.post("/api/access", (req, res) => {
  if (!inviteCode) return res.status(503).json({ error: "Invite code is not configured" });
  if (req.body?.code !== inviteCode) return res.status(401).json({ error: "Invalid code" });
  res.json({ ok: true });
});
const requestWindows = new Map();
app.post("/api/chat", async (req, res) => {
  try {
    if (!client) return res.status(503).json({ error: "Groq ещё не подключён: на сервере не задан AI_API_KEY." });

    // Basic per-IP throttling to reduce accidental quota exhaustion.
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();
    const recent = (requestWindows.get(ip) || []).filter(t => now - t < 60_000);
    if (recent.length >= 12) return res.status(429).json({ error: "Слишком много запросов подряд. Подожди минуту." });
    recent.push(now);
    requestWindows.set(ip, recent);

    const { character = {}, prompt = "", messages = [] } = req.body || {};
    if (typeof prompt !== "string" || !prompt.trim()) {
      return res.status(400).json({ error: "Не получен контекст ролевой сцены." });
    }
    const safePrompt = prompt.slice(-16000);
    const completion = await client.chat.completions.create({
      model: process.env.AI_MODEL || "openai/gpt-oss-20b",
      messages: [
        { role: "system", content: `Ты — актёр ролевой игры. Пиши только на русском языке. Следуй карточке выбранного персонажа и контексту сцены. Сохраняй характер, канон, отношения и последовательность событий. Не управляй персонажем пользователя: не придумывай за него реплики, мысли или действия. Развивай сцену естественно, отвечай живо и не слишком длинно. Не выходи из роли. Соблюдай безопасный неэксплицитный формат; несовершеннолетних персонажей не сексуализируй.` },
        { role: "user", content: safePrompt }
      ],
      max_tokens: 1100,
      temperature: 0.85
    });
    const text = completion.choices?.[0]?.message?.content || "";
    res.json({ text });
  } catch (e) {
    console.error("AI chat error:", e?.message || e);
    const status = e?.status === 429 ? 429 : 502;
    res.status(status).json({ error: status === 429
      ? "У Groq закончился лимит запросов. Попробуй немного позже."
      : "Groq временно не смог ответить. Попробуй ещё раз." });
  }
});
app.post("/api/image", (_req, res) => res.status(501).json({ error: "Генерация изображений пока не подключена." }));
const port = Number(process.env.PORT || 3000);
app.listen(port, "0.0.0.0", () => console.log(`Roleplay Dalma listening on ${port}`));
