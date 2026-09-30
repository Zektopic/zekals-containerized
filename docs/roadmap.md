# Modernization plan

Changes are submitted as a stack of focused pull requests. Merge in order; each
successive branch includes the prerequisites of the preceding branch.

1. **Secure runtime:** remove divergent `pf-*` copies; one same-origin HTTP and
   WebSocket service, bounded messages, no public tracker or privileged container,
   actual application tests and dependency auditing.
2. **Tracking and performance:** optional native Rust filtering, bounded camera
   processing, real CPU/GPU provider selection with fallback, explicit loss of
   tracking, normalized coordinates, repeatable benchmarks and calibration.
3. **Accessible interface:** large controls, contrast, keyboard/touch/switch/dwell
   access, pause and undo, persistent preferences, no blocking camera overlay,
   automated interaction and accessibility checks.
4. **Speech and languages:** local speech with installed voices, optional offline
   neural speech, discoverable validated packs, multilingual layouts and an
   extension example. No unsolicited cloud processing.
5. **Delivery and documentation:** reproducible installation, architecture,
   hardware matrix, privacy, troubleshooting, migration and contributor guidance.
6. **Android companion:** separate native application, C++/JNI filtering, offline
   Android speech, accessible controls, optional camera inference, explicit
   accelerator selection and fallback, build/test workflows and documentation.

## Acceptance and remaining research

Automated tests must use production code. No test files are generated or rewritten
by CI. Correctness, loss-of-tracking cancellation, privacy and working alternative
input are prerequisites to speed claims. Record host measurements separately from
physical-device verification. Raspberry Pi, GPU/NPU and Android camera accuracy
require hardware trials. A webcam iris estimate is an experimental input method;
fit and validate calibration for each user and do not describe it as a clinical
or commercial eye tracker. Evaluate with people with ALS and caregivers before
claiming that usability or language translations are validated.

Future improvements: personal phrase import/export, user-reviewed phrase ranking,
optional hardware eye-tracker adapters, per-user calibration profiles, independent
accessibility review and sustained thermal/power benchmarks. Cloud suggestions
need an explicit privacy design and are intentionally excluded from the default.
