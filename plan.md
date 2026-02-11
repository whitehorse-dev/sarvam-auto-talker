# openai-codex

## Concrete implementation plan: Live Hindi <-> English conversation website

## Goal
Build a web app where two people can talk in different languages in real time:
- Speaker A talks in Hindi, listener B hears English.
- Speaker B talks in English, listener A hears Hindi.

Phase 1 focuses only on Hindi <-> English, with architecture ready for more languages later.

## Scope for MVP (what will be built now)
- Two-user live session in browser.
- Push-to-talk turn-based speaking (not full duplex in MVP).
- Speech pipeline per turn:
  1. Record short audio chunk while user speaks.
  2. Speech-to-text (Sarvam STT).
  3. Text translation (Sarvam Translate).
  4. Text-to-speech (Sarvam TTS).
  5. Play translated speech to other user.
- Show transcript + translated text on screen.

## Out of scope for MVP (do later)
- Full duplex and barge-in.
- Advanced noise suppression.
- Multi-party calls.
- On-device fallback models.

## Finalized product decisions for MVP
- Turn model: Push-to-talk.
- Language mapping:
  - User A channel language fixed to `hi-IN`.
  - User B channel language fixed to `en-IN` (configurable to `en-US`).
- Translation direction based on channel:
  - A -> B => `hi-IN` to `en-IN`
  - B -> A => `en-IN` to `hi-IN`
- No auto language detection in MVP (reduces ambiguity and latency risk).

## Sarvam API mapping (based on provided quickstart)
- STT endpoint: `POST https://api.sarvam.ai/speech-to-text`
  - Model: `saaras:v3`
  - Mode: `transcribe`
- Translate endpoint: `POST https://api.sarvam.ai/translate`
  - `input`, `source_language_code`, `target_language_code`
- TTS endpoint: `POST https://api.sarvam.ai/text-to-speech`
  - `text`, `target_language_code`, optional `speaker`
- Auth header: `api-subscription-key: <SARVAM_API_KEY>`

## Target architecture
1. Frontend (Web)
- Tech: Next.js/React (or plain React), Web Audio API.
- Responsibilities:
  - Capture mic audio.
  - Push-to-talk UX and session controls.
  - Render source transcript + translated text.
  - Play returned translated audio.

2. Backend (API server)
- Tech: Node.js + Express/Fastify.
- Responsibilities:
  - Hold Sarvam API key securely.
  - Receive audio uploads from client.
  - Call STT -> Translate -> TTS in sequence.
  - Return transcript, translation, and audio payload URL/base64.
  - Emit metrics/logs.

3. Session layer
- MVP: simple room id + two roles (`A`, `B`).
- Transport: HTTPS REST for turn submission + WebSocket for realtime events.

## Repository structure (proposed)
```text
/web
  /src
    /components
    /pages or /app
    /lib
/server
  /src
    /routes
    /services
      sarvamStt.ts
      sarvamTranslate.ts
      sarvamTts.ts
      pipeline.ts
    /session
    /metrics
/shared
  types.ts
plan.md
```

## Detailed execution plan

## Phase 0: Setup and API verification (Day 1)
Deliverables:
- Sarvam key configured via env var (`SARVAM_API_KEY`).
- Backend health endpoint.
- Postman/cURL collection tested for:
  - STT Hindi + English sample files.
  - Translate both directions.
  - TTS both directions.

Tasks:
1. Create `.env.example` with required variables.
2. Add backend route `GET /health`.
3. Add script or docs commands for direct endpoint checks.
4. Save validated payload templates in `/server/src/services/examples`.

Exit criteria:
- All 3 APIs return successful responses with expected fields.

## Phase 1: Single-turn pipeline (Day 2-3)
Deliverables:
- Endpoint `POST /api/turn` that accepts:
  - audio file
  - speaker role (`A|B`)
  - session id
- Response includes:
  - source transcript
  - translated text
  - playable translated audio

Tasks:
1. Implement STT service wrapper.
2. Implement Translate service wrapper.
3. Implement TTS service wrapper.
4. Implement `pipeline.ts` orchestrator.
5. Add timeout + retry policy:
  - retry once for 429/5xx
  - no retry for 4xx validation errors
6. Add structured logging with request id.

Exit criteria:
- End-to-end turn works in local API testing.
- Median processing latency under 3.5s with short utterances.

## Phase 2: Frontend MVP UI (Day 4-5)
Deliverables:
- Two-panel interface:
  - Left: User A (Hindi)
  - Right: User B (English)
- Push-to-talk button per user.
- Transcript + translated text cards.
- Audio playback on receiver side.

Tasks:
1. Build room creation/join screen.
2. Build push-to-talk recording component.
3. Upload recorded WAV to `POST /api/turn`.
4. Render response text and play audio.
5. Add basic failure UI (retry turn).

Exit criteria:
- Two browser tabs can complete a full Hindi -> English -> Hindi exchange.

## Phase 3: Realtime session behavior (Day 6-7)
Deliverables:
- WebSocket events for turn state:
  - `turn_started`
  - `turn_processing`
  - `turn_delivered`
  - `turn_failed`
- Presence status for both participants.

Tasks:
1. Add WS channel by room id.
2. Broadcast turn state transitions.
3. Lock speaker button while turn in progress.
4. Add reconnect handling and session resume.

Exit criteria:
- Smooth handoff between speakers with clear state feedback.

## Phase 4: Hardening and release prep (Day 8-10)
Deliverables:
- Reliability, observability, and deployment baseline.

Tasks:
1. Add input limits:
  - max audio duration per turn (e.g., 12s)
  - max file size
2. Add API rate limit per room/user.
3. Add metrics:
  - stt_ms, translate_ms, tts_ms, end_to_end_ms
  - success/failure counts per direction
4. Add integration tests for both directions.
5. Add deployment config and runbook.

Exit criteria:
- Stable demo-ready build with measurable performance.

## API contract (MVP)

### POST `/api/turn`
Request (multipart/form-data):
- `audio` (wav/webm)
- `session_id` (string)
- `speaker_role` (`A` or `B`)

Server mapping:
- If `speaker_role=A`: source `hi-IN`, target `en-IN`
- If `speaker_role=B`: source `en-IN`, target `hi-IN`

Response (JSON):
```json
{
  "session_id": "abc123",
  "speaker_role": "A",
  "source_language": "hi-IN",
  "target_language": "en-IN",
  "transcript": "??????, ?? ???? ????",
  "translation": "Hello, how are you?",
  "audio": {
    "mime_type": "audio/wav",
    "base64": "..."
  },
  "latency_ms": {
    "stt": 620,
    "translate": 180,
    "tts": 740,
    "total": 1660
  }
}
```

## Testing plan
- Unit tests:
  - language routing by role
  - retry policy behavior
  - error normalization
- Integration tests:
  - Hindi turn full path
  - English turn full path
- Manual QA scenarios:
  - noisy input
  - long pause mid-turn
  - API timeout and retry
  - participant reconnect

## Risks and mitigations
- Risk: STT accuracy drops in noisy environments.
  - Mitigation: add client-side noise suppression, prompt users to use headset.
- Risk: latency spikes from sequential API calls.
  - Mitigation: short turns, timeout controls, smaller audio chunks.
- Risk: translation style feels formal/unnatural.
  - Mitigation: post-processing prompt/template in future phase.

## Security and compliance checklist
- Keep `SARVAM_API_KEY` only on server.
- Never expose key to frontend.
- Do not store raw audio by default in MVP.
- Redact PII in logs where possible.
- Add CORS and origin allowlist.

## Definition of done (MVP)
- Two users can complete a natural back-and-forth conversation across Hindi and English in browser.
- 90th percentile end-to-end turn latency <= 3.0s on stable network for short utterances.
- Error rate < 5% across 100 test turns.
- Basic session stability and reconnect works.

## Next after MVP
1. Move from push-to-talk to full duplex streaming.
2. Add language auto-detection toggle.
3. Add more language pairs via config (`SUPPORTED_LANGS`).
4. Add conversation history and downloadable transcript.
