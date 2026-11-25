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
app.post("/api/chat", async (req, res) => {
  try {
    if (!client) return res.status(503).json({ error: "AI is not configured yet." });
    const { character = {}, messages = [] } = req.body || {};
    const system = `Ты — ИИ-актёр для текстовой ролевой игры. Играй только выбранного вымышленного персонажа и подстраивай каждую реплику под его личность.
ПЕРСОНАЖ: ${character.name || "Персонаж"}.
ВСЕЛЕННАЯ И ИСТОЧНИК: ${character.project || character.category || "не указано"}.
ХАРАКТЕР И МАНЕРА РЕЧИ: ${character.personality || "следуй описанию и контексту"}.
ВНЕШНОСТЬ: ${character.appearance || "не указана"}.
ПРЕДЫСТОРИЯ: ${character.bio || "не указана"}.
ВОЗРАСТ: ${character.age || "не указан"}.
ПРАВИЛА ИГРЫ:
- Сохраняй индивидуальный словарь, темперамент, чувство юмора, привычки и эмоциональные реакции персонажа; не делай всех героев одинаковыми.
- Учитывай предыдущие реплики и факты сцены, не противоречь уже установленным событиям и отношениям.
- Отвечай естественно, живо и по ситуации; чередуй короткие реплики и описания, не превращай каждый ответ в длинный монолог.
- Можешь самостоятельно предлагать действия и развивать сцену, но никогда не описывай мысли, слова или действия персонажа пользователя вместо него.
- Не пересказывай сообщение пользователя. Не выходи из роли без необходимости и не утверждай, что являешься реальным человеком.
- Если в описании персонажа мало данных, аккуратно выводи манеру поведения из его уже показанных реплик, не придумывая резко противоположный характер.
- Сохраняй безопасный, неэксплицитный формат общения; если персонаж несовершеннолетний, не создавай сексуальный контент.
`;
    const history = Array.isArray(messages) ? messages.slice(-32) : [];
    const completion = await client.chat.completions.create({
      model: process.env.AI_MODEL || "openai/gpt-oss-20b",
      messages: [{ role: "system", content: system }, ...history.map(m => ({
        role: m.role === "user" ? "user" : "assistant",
        content: String(m.content || "").slice(0, 6000)
      }))],
      max_tokens: 1100,
      temperature: 0.85
    });
    res.json({ text: completion.choices?.[0]?.message?.content || "..." });
  } catch (e) {
    console.error("AI chat error:", e?.message || e);
    res.status(500).json({ error: "Не удалось получить ответ ИИ. Попробуй ещё раз." });
  }
});
app.post("/api/image", (_req, res) => res.status(501).json({ error: "Генерация изображений пока не подключена." }));
const port = Number(process.env.PORT || 3000);
app.listen(port, "0.0.0.0", () => console.log(`Roleplay Dalma listening on ${port}`));
