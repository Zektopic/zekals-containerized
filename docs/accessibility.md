# Communication and access

The message editor accepts a physical keyboard, touch, and the device's input
method editor. Select a phrase or a virtual key to insert it at the caret. Speak
reads the whole message. Stop cancels speech. Clear can be reversed using Undo;
30 edits are retained in memory. Messages and undo history are not saved on disk.

## Access modes

- **Touch / keyboard:** default on every page load. Tab moves between controls;
  Enter activates a focused button. The editable message works with system IMEs.
- **Pointer dwell:** keep the pointer over a button for the selected time. The
  progress bar shows the pending selection. Move away before choosing it again.
- **Single switch:** buttons are highlighted sequentially. Space chooses the
  highlighted button. Space resumes after a pause. Dialog buttons are included;
  hidden controls are excluded. Configure switches to send Space.
- **Eye tracking:** start the optional tracker, calibrate in Settings, and select
  buttons with your gaze. No gaze selection occurs before calibration succeeds.

The fixed Scroll up and Scroll down controls let gaze, dwell and switch users reach
content outside the viewport. The Pause control stays visible while scrolling.

Escape pauses automatic selection and stops speech. Pause remains accessible;
touch and physical keyboard work while automatic selection is paused. Hiding the
tab pauses it. Lost or stale tracking cancels pending dwell. Disconnecting a
camera never blocks the communication interface.

## Calibration

Use a stable, comfortable head position and even lighting. Start Calibrate, then
look at each of the five targets for three seconds. Samples are taken only after
the settling interval. Insufficient samples, little movement, or excessive fitting
error reject the calibration. Reposition and retry if necessary. Calibration stays
in memory and is invalidated on resize. Test the large phrase buttons first and
repeat after posture, screen position or lighting changes. The fitting check is
not a substitute for an independent accuracy test with the intended user.

## Readability and preferences

Settings includes large text, high contrast, dwell duration (0.5–3 seconds), scan
interval (0.6–4 seconds), voice choice and speech speed. Preferences are stored in
local browser storage, without message content. Clearing site storage resets them.
The interface uses system fonts, visible focus outlines, live status messages and
large text labels. No external fonts or animation assets are downloaded.

Automated Chromium interaction tests and axe checks cover the main view and
settings. They do not establish complete WCAG conformance or usability for every
person with ALS. Manually test screen readers, browser zoom, real switches,
fatigue, gaze accuracy and the user's preferred language on the intended device.
