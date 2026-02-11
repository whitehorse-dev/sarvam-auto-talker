# Server quickstart

## 1. Install dependencies

```bash
cd server
npm install
```

## 2. Configure environment

```bash
cp .env.example .env
```

Set `SARVAM_API_KEY` in `.env`.

## 3. Run server

```bash
npm run dev
```

Health check:

```bash
curl http://localhost:8080/health
```

Open the web app:

```text
http://localhost:8080
```

## API verification routes

### STT

```bash
curl -X POST http://localhost:8080/api/verify/stt \
  -F "model=saaras:v3" \
  -F "mode=transcribe" \
  -F "audio=@sample.wav;type=audio/wav"
```

### Translate

```bash
curl -X POST http://localhost:8080/api/verify/translate \
  -H "Content-Type: application/json" \
  -d '{
    "input":"??????, ?? ???? ????",
    "source_language_code":"hi-IN",
    "target_language_code":"en-IN"
  }'
```

### TTS

```bash
curl -X POST http://localhost:8080/api/verify/tts \
  -H "Content-Type: application/json" \
  -d '{
    "text":"Hello, how are you?",
    "target_language_code":"hi-IN"
  }'
```

## Turn pipeline (Phase 1)

```bash
curl -X POST http://localhost:8080/api/turn \
  -F "session_id=session-1" \
  -F "speaker_role=A" \
  -F "audio=@sample-hi.wav;type=audio/wav"
```

Notes:
- `speaker_role=A` means Hindi speaker and English output.
- `speaker_role=B` means English speaker and Hindi output.

## Phase 2 UI controls
- Use one browser window with two panels, or two tabs for two users.
- Hold `Hold to Talk` while speaking, then release to send.
- `Retry Last Turn` resends the same recorded audio for that role.
