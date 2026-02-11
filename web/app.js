const statusEl = document.getElementById("status");
const sessionInput = document.getElementById("session-id");

const transcriptEls = {
  A: document.getElementById("transcript-a"),
  B: document.getElementById("transcript-b")
};

const translationEls = {
  A: document.getElementById("translation-a"),
  B: document.getElementById("translation-b")
};

const talkButtons = Array.from(document.querySelectorAll(".talk-btn"));

const state = {
  stream: null,
  mediaRecorder: null,
  chunks: [],
  activeRole: null,
  processing: false
};

sessionInput.value = `session-${Math.random().toString(36).slice(2, 8)}`;

function setStatus(text, isError = false) {
  statusEl.textContent = text;
  statusEl.style.color = isError ? "#b91c1c" : "#6b7280";
}

function setBusy(isBusy) {
  state.processing = isBusy;
  talkButtons.forEach((btn) => {
    btn.disabled = isBusy;
  });
}

function pickMimeType() {
  const options = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  for (const mime of options) {
    if (window.MediaRecorder && MediaRecorder.isTypeSupported(mime)) {
      return mime;
    }
  }
  return "";
}

async function ensureMic() {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Browser does not support microphone capture.");
  }
  if (!state.stream) {
    state.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  }
  return state.stream;
}

function setButtonRecording(role, recording) {
  const btn = talkButtons.find((b) => b.dataset.role === role);
  if (!btn) return;
  btn.classList.toggle("recording", recording);
  btn.textContent = recording ? "Recording... tap to send" : "Tap to Talk";
}

function attachTapEvents(button) {
  const role = button.dataset.role;

  const onClick = async (event) => {
    event.preventDefault();
    if (state.processing) {
      return;
    }

    if (state.activeRole === role) {
      try {
        await stopRecordingAndSend(role);
      } catch (error) {
        setStatus(error.message || "Failed to process turn.", true);
        setBusy(false);
      }
      return;
    }

    if (state.activeRole && state.activeRole !== role) {
      return;
    }

    try {
      await startRecording(role);
    } catch (error) {
      setStatus(error.message || "Microphone start failed.", true);
    }
  };

  button.addEventListener("click", onClick);
}

async function startRecording(role) {
  const stream = await ensureMic();
  const mimeType = pickMimeType();

  state.chunks = [];
  state.activeRole = role;
  setStatus(`Recording ${role}...`);
  setButtonRecording(role, true);

  state.mediaRecorder = mimeType
    ? new MediaRecorder(stream, { mimeType })
    : new MediaRecorder(stream);

  state.mediaRecorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      state.chunks.push(event.data);
    }
  };

  state.mediaRecorder.start();
}

async function stopRecordingAndSend(role) {
  const recorder = state.mediaRecorder;
  if (!recorder) {
    return;
  }

  setBusy(true);
  setStatus(`Processing turn for ${role}...`);

  await new Promise((resolve) => {
    recorder.onstop = resolve;
    recorder.stop();
  });

  state.mediaRecorder = null;
  setButtonRecording(role, false);
  state.activeRole = null;

  const type = state.chunks[0]?.type || "audio/webm";
  const blob = new Blob(state.chunks, { type });

  await submitTurn(role, blob);
  setBusy(false);
}

async function submitTurn(role, audioBlob) {
  const sessionId = String(sessionInput.value || "").trim();
  if (!sessionId) {
    throw new Error("Session id is required.");
  }

  const ext = audioBlob.type.includes("wav") ? "wav" : "webm";
  const form = new FormData();
  form.append("session_id", sessionId);
  form.append("speaker_role", role);
  form.append("audio", audioBlob, `turn.${ext}`);

  const response = await fetch("/api/turn", {
    method: "POST",
    body: form
  });

  const payload = await response.json();
  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || "Turn processing failed.");
  }

  transcriptEls[role].textContent = payload.transcript || "-";
  translationEls[role].textContent = payload.translation || "-";

  await playOutputAudio(payload.audio, role, payload.translation);

  const ms = payload.latency_ms?.total || 0;
  setStatus(`Turn complete (${ms} ms)`);
}

function getTargetSpeechLang(role) {
  return role === "A" ? "en-IN" : "hi-IN";
}

function speakWithBrowserTts(text, role) {
  return new Promise((resolve) => {
    if (!text || !window.speechSynthesis) {
      resolve(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = getTargetSpeechLang(role);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.onend = () => resolve(true);
    utterance.onerror = () => resolve(false);

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  });
}

async function playOutputAudio(audio, role, fallbackText) {
  if (!audio) {
    const spoke = await speakWithBrowserTts(fallbackText, role);
    if (!spoke) {
      setStatus("No playable audio returned from TTS.", true);
    }
    return;
  }

  let src = "";
  if (audio.base64) {
    src = `data:${audio.mime_type || "audio/wav"};base64,${audio.base64}`;
  } else if (audio.url) {
    src = audio.url;
  }

  if (!src) {
    const spoke = await speakWithBrowserTts(fallbackText, role);
    if (!spoke) {
      setStatus("No playable audio returned from TTS.", true);
    }
    return;
  }

  try {
    const player = new Audio(src);
    await player.play();
  } catch (_error) {
    const spoke = await speakWithBrowserTts(fallbackText, role);
    if (!spoke) {
      setStatus("Audio playback was blocked by the browser.", true);
    }
  }
}

talkButtons.forEach(attachTapEvents);
setBusy(false);
