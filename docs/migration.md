# Migration from version 1

1. Back up local configuration. The source tree now has one maintained `za-frontend`
   and `za-backend`; duplicate `pf-*` directories were removed.
2. Install Node 22+; optional camera support uses Python 3.12+ and the Tasks API,
   with an explicit model download. The obsolete Face Mesh initialization and
   PyAutoGUI global mouse control were removed.
3. Recreate `.env` from the example, preserving only settings still documented.
   Gemini keys and location are unused. API keys are no longer required.
4. Browser HTTP and WebSocket share one port; `/ws` replaces the separate 8081
   mapping. Host tracking uses `TRACKER_URL=ws://127.0.0.1:8765` explicitly.
5. Default Compose starts only the UI. Add the camera override after model/token
   setup. Remove old privileged/X11 deployments yourself after checking their use.
6. `HARDWARE_MODE` now selects an actual adapter/delegate; it no longer merely
   changes a log message. Review the hardware support matrix before enabling it.
7. Language files use schema version 1. Convert custom legacy action-key objects
   into character rows, UI strings and separately labeled application controls.
8. Cloud completions and fabricated weather/news suggestions have been replaced
   with predictable local phrase boards. Adding cloud processing requires an
   explicit consent/privacy design and is future work.
9. Recalibrate for the current viewport. Legacy screen-pixel offsets are incompatible
   with normalized, user-calibrated input. No calibration is carried over silently.

There is no automated production deployment or database migration. The repository
had no persisted message database to migrate. Inspect existing local services
before removing containers or processes; setup scripts never terminate unrelated
applications or change machine-wide configuration.
