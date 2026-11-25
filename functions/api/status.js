export async function onRequestGet({ env }) {
  return new Response(JSON.stringify({ online: true, aiConfigured: Boolean(env.GROQ_API_KEY) }), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}
