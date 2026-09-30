# Speech and language packs

English (`en-US`), French (`fr-FR`), Simplified Chinese / Mandarin (`zh-CN`),
Italian (`it-IT`) and Sinhala (`si-LK`) are the priority packs. Greek (`el-GR`) is
preserved. Each pack contains interface strings, a character board, phrases and
speech metadata. Priority packs contain every UI string in the English reference;
translations still need review by native speakers and intended users. Greek has
English fallback strings. Chinese refers to Simplified Chinese here; Traditional
Chinese and other spoken varieties need separate packs and voices.

## Device voices

The default engine uses installed **local** browser/system voices matching the
language. Network voices are excluded. Settings cycles through available local
voices and controls speed. Some browsers expose no local voices; install a system
voice or use the neural engine below. Unsupported languages produce a visible
message rather than speaking in an unrelated voice. Browser audio policies may
require an initial touch/click from a caregiver before gaze-initiated playback.

## Offline neural voices

Piper is an optional local service. Once a model has been downloaded, synthesis
runs locally; zekALS does not download models during a conversation.

```bash
python3 -m venv .speech-venv
.speech-venv/bin/pip install -r za-backend/requirements-speech.txt
.speech-venv/bin/python -m piper.download_voices --data-dir models/voices en_US-lessac-medium fr_FR-siwis-medium it_IT-paola-medium zh_CN-huayan-medium
.speech-venv/bin/python -m piper.http_server --host 127.0.0.1 --port 5000 --data-dir models/voices -m en_US-lessac-medium
```

Review the model cards and licenses before distributing voices. Configure the UI
process in `.env` (do not source this file as a shell script):

```dotenv
PIPER_URL=http://127.0.0.1:5000/synthesize
PIPER_VOICES={"en":"en_US-lessac-medium","fr":"fr_FR-siwis-medium","it":"it_IT-paola-medium","zh":"zh_CN-huayan-medium"}
```

Restart `npm start` and choose **Local neural voice** in Settings. The proxy only
uses this configured URL and voice allowlist. It limits text to 2,000 UTF-16 code
units, input to 12 KB, audio to 12 MiB, upstream requests to 20 seconds and
concurrent synthesis to one request. Busy engines return a retryable error.
Stop cancels pending browser requests and playback, and stale responses cannot
start speaking. The external engine may finish an already-started computation.
Audio is held in memory, never cached or written to disk by the UI service.

For Docker, `127.0.0.1` refers to the UI container. Run Piper in an isolated local
service/network and configure its internal hostname, or run both services on the
host. Do not expose the unauthenticated Piper HTTP service to a public network.
The default Compose file intentionally does not start or publish a speech service.

The checked Piper catalog includes the four example voices above but no Sinhala
voice. Sinhala text and phrases work; natural Sinhala speech requires a compatible
installed voice or a separately integrated model/engine. A language pack does not
create a voice. Voice quality is subjective and should be evaluated with the user.
Do not claim Sinhala neural speech is bundled or that all device voices sound alike.

The integration was checked with actual English Piper synthesis on the development
host; other voices require installation and listening tests. See
[Piper HTTP API](https://github.com/OHF-Voice/piper1-gpl/blob/main/docs/API_HTTP.md)
and [voice catalog](https://huggingface.co/rhasspy/piper-voices/blob/main/voices.json).

## Text entry and Unicode

The editable message accepts operating-system IMEs, including Chinese Pinyin and
Sinhala keyboards. The Chinese on-screen board supplies common characters across
pages and phrases; it is **not a full Pinyin-to-Hanzi input method**. Sinhala has
letters and combining signs across two pages. More characters cycles through all
pages and symbols. Grapheme-aware deletion preserves emoji and combining scripts.
Validate conjunct handling with the user's browser and native language input method.

## Add a language

1. Copy `examples/language-pack/es.json` into `za-frontend/languages/es.json`.
2. Replace the example's English strings; set the code, BCP 47 locale, native name,
   direction, phrases and keyboard. Translate every English reference key.
3. Add extra character pages to `keyboardPages`. Use JSON strings, never markup.
   Supply right-to-left direction where appropriate. Avoid putting destructive
   actions inside the character layout; actions remain separately labeled controls.
4. Set `speech.locale` to the same locale. `speech.piperVoice` is documentation
   metadata; enabling a downloaded neural model requires the server allowlist.
5. Run `node za-frontend/language-packs.js` and `npm test --prefix za-frontend`.
   Restart the server; the language catalog discovers the pack automatically.
6. Test layout, grapheme deletion, voice pronunciation, IME composition and phrases
   with a native speaker. Update `reviewStatus` only after actual review.

A JSON Schema is included at `examples/language-pack/schema.json`; production
startup also validates pack identity, bounded text, layouts, locales and required
UI keys. No application code change is needed for a new pack. The Spanish example
is an intentionally incomplete translation template, not a shipped Spanish pack.
