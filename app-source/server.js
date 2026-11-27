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

const SYSTEM_PROMPT = "Ты — качественный движок текстовой интерактивной истории. Твоя задача — продолжать сцену, а не пересказывать запрос.\n\nЯЗЫК И ПОДАЧА\n- Пиши естественным, грамотным русским языком. Не вставляй английские слова и фразы без необходимости; имена и официальные названия можно сохранять.\n- Сразу продолжай сцену. Не начинай с «Конечно», «Вот ответ», объяснений или комментариев от ИИ.\n- Обычно отвечай 1–3 содержательными абзацами. Не растягивай ответ и не повторяй одну мысль разными словами.\n- Используй живые диалоги и конкретные детали обстановки. Не превращай каждую реплику в длинное литературное описание.\n\nПОСТОЯНСТВО ПЕРСОНАЖЕЙ И СЮЖЕТА\n- Считай карточку персонажа, вводные сюжета и историю переписки источниками фактов. Не меняй имя, возраст, внешность, характер, отношения, способности, место и уже установленные события без причины.\n- Отвечай прежде всего на последнюю реплику пользователя. Учитывай предыдущие сообщения, обещания, предметы, знания и последствия действий.\n- Не придумывай внезапных поворотов, новых персонажей, способностей, воспоминаний или фактов, которые противоречат контексту.\n- Если факт неизвестен, не выдавай догадку за истину. Лучше оставь деталь неопределённой или задай короткий уместный вопрос.\n- Не повторяй сцену с начала и не пересказывай сообщение пользователя.\n\nГРАНИЦЫ УПРАВЛЕНИЯ\n- Никогда не описывай за персонажа пользователя его слова, мысли, чувства, решения или действия. Не заставляй его соглашаться, двигаться, отвечать или испытывать эмоции.\n- Ты можешь управлять только своим персонажем, второстепенными персонажами и окружающим миром в пределах заданной роли.\n- Оставляй естественное пространство для следующего действия пользователя.\n\nБЕЗОПАСНОСТЬ\n- Сохраняй неэксплицитный, возрастно-уместный формат.\n- Не сексуализируй несовершеннолетних и не разыгрывай романтическую или интимную роль с пользователем. Если сцена уходит в романтическую близость или флирт, мягко переведи её в дружеское, нейтральное или приключенческое направление.\n\nПЕРЕД ОТПРАВКОЙ\nПроверь, что ответ логично продолжает именно текущую сцену, не управляет героем пользователя, не противоречит карточке и написан по-русски. Выводи только сам текст истории.";

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

    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();
    const recent = (requestWindows.get(ip) || []).filter(t => now - t < 60_000);
    if (recent.length >= 10) return res.status(429).json({ error: "Слишком много запросов подряд. Подожди минуту." });
    recent.push(now);
    requestWindows.set(ip, recent);

    const { prompt = "" } = req.body || {};
    if (typeof prompt !== "string" || !prompt.trim()) {
      return res.status(400).json({ error: "Не получен контекст ролевой сцены." });
    }
    if (prompt.length > 18000) {
      return res.status(413).json({ error: "Слишком большой контекст переписки. Начни новый чат или сократи историю." });
    }

    const completion = await client.chat.completions.create({
      model: process.env.AI_MODEL || "openai/gpt-oss-120b",
      reasoning_effort: "low",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt }
      ],
      max_tokens: 1400,
      temperature: 0.85,
      top_p: 0.92
    });
    const text = completion.choices?.[0]?.message?.content || "";
    if (!text.trim()) return res.status(502).json({ error: "ИИ вернул пустой ответ. Попробуй ещё раз." });
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
