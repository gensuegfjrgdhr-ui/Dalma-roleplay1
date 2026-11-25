# Roleplay Dalma

Mobile-friendly roleplay prototype. The site can start without an AI key, but AI replies stay disabled until a provider key is configured.

## Render settings
- Runtime: Node
- Build command: `npm install`
- Start command: `npm start`
- Plan: Free

## Environment variables
- `INVITE_CODE`: entry code for the prototype
- `AI_API_KEY`: secret provider key; never put it in source code
- `AI_BASE_URL`: defaults to `https://api.groq.com/openai/v1`
- `AI_MODEL`: defaults to `openai/gpt-oss-20b`

Groq's API has an OpenAI-compatible endpoint. Check current account terms, model limits, and any possible charges before enabling usage.

## Prototype limits
Character cards and chat histories are saved in the browser on the current device. Shared rooms, accounts, cross-device sync, and image generation are not connected yet.
