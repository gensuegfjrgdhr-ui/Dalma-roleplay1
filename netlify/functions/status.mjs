export default async function handler() {
  return new Response(JSON.stringify({
    online: true,
    aiConfigured: Boolean(process.env.GROQ_API_KEY)
  }), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

export const config = { path: "/api/status" };
