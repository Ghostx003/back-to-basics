# Back to Basics

> Back to Basics is a lightweight Chrome and Brave extension for structured study sessions, automatic lesson transitions, and Pomodoro-inspired breaks.

---

## 1. Product Overview

Back to Basics was created for people who are restarting their learning journey and want a simpler way to build a consistent study routine. The idea is straightforward: configure your study material, choose your session lengths, and let the extension handle the transitions and breaks. By making focused sessions and regular breaks easier to follow, Back to Basics aims to reduce the number of decisions users need to make while studying.

The central philosophy is:
> **«Make it easier to start studying, harder to get distracted, and unnecessary to keep making decisions throughout a study session.»**

---

## 2. Why Back to Basics Exists

Many people intend to study but struggle to maintain a consistent routine. They open a lecture, become distracted, postpone their breaks, or continue studying without taking necessary breaks because they are absorbed in the material.

Back to Basics gives users a way to prepare their study schedule in advance and let the software handle the transitions. The extension deliberately uses structured study sessions and enforced breaks. Its Pomodoro-inspired approach is intended to make focused work and regular breaks easier to follow without requiring constant manual micro-decisions.

---

## 3. Core Features

- **Automated Lesson Transitions**: Seamlessly closes the active study tab and launches the next lesson when duration ends.
- **Dual Study Modes**: Scheduled Study for multi-subject syllabi and Pomodoro Mode for focused work/break intervals.
- **Enforced Full-Page Break Overlay**: Full-page dark overlay with circular and digital countdowns to ensure true visual rest.
- **Intelligent Media Control**: Automatically pauses video playback during breaks and attempts to resume it afterwards.
- **Distraction & Navigation Guard**: Distinguishes between internal study navigation and unrelated browsing, offering quick return actions.
- **Deadline-Based Timing**: Reliable, drift-free countdowns backed by Chrome alarms that survive service worker suspension and browser restarts.
- **Final 30-Second Ticking Sound**: Subtle mechanical clock tick synthesized in real time via the Web Audio API with zero external audio assets.
- **Privacy & Local Operation**: 100% local operation with zero tracking, analytics, subscriptions, or external servers.

---

## 4. Scheduled Study Mode

Designed for sequential curriculum progression (e.g. 40 minutes of Math, followed by 35 minutes of Operating Systems, followed by 45 minutes of DBMS).

- **Flexible Subject Queue**: Add any number of subjects with individual URLs and custom durations.
- **Dedicated Paste URL Button**: Single-click clipboard paste with permission error handling and whitespace trimming.
- **Automatic Transitions**: Automatically opens the next lesson when the previous duration expires.
- **Live Controls**: Pause (freezes timer), Resume (recalculates deadline), and Reset (restarts current session with confirmation).

---

## 5. Pomodoro Mode

Designed for interval study on deep-dive material (e.g. 3 sessions of 25 minutes with 5-minute rest breaks).

- **Configurable Intervals**: Quick toggle between 25-minute and 50-minute study durations, plus customizable break durations.
- **Session Tracking**: Executes the exact configured number of sessions per subject before advancing to the next subject.
- **Final Session Logic**: By default, avoids forcing an extra break after the final session of a subject, seamlessly advancing to the next subject or completion screen.
- **Skip Break Action**: Single-click break skipping that immediately removes the overlay and resumes study.

---

## 6. Video Controls and Supported Websites

Back to Basics employs a layered media controller:
1. **Standard HTMLMediaElement**: Inspects all visible `<video>` and `<audio>` elements across custom course portals and LMS platforms.
2. **YouTube Player Integration**: Leverages YouTube player controls and verified pause/play events.
3. **Playback Speed Independence**: Session timers are strictly based on wall-clock time and are completely unaffected by video playback speeds (e.g., 1.25x, 1.5x, 2x).
4. **Playback State Memory**: Remembers whether a video was playing before the break, avoiding unwanted autoplay if the video was already paused.

> *Note: Support for website-specific embedded or DRM-protected players may vary depending on the host site's iframe security policies.*

---

## 7. Installation Instructions for Google Chrome

1. Clone or download this repository.
2. Install dependencies and build the extension:
   ```bash
   npm install
   npm run build
   ```
3. Open Google Chrome and navigate to `chrome://extensions/`.
4. Enable **Developer mode** using the toggle switch in the top right corner.
5. Click **Load unpacked** in the top left corner.
6. Select the `dist/` directory inside this repository.
7. Click the extension icon in your Chrome toolbar to start studying!

---

## 8. Installation Instructions for Brave Browser

1. Build the production extension using `npm run build`.
2. Open Brave and navigate to `brave://extensions/`.
3. Toggle on **Developer mode** in the top right corner.
4. Click **Load unpacked**.
5. Select the `dist/` directory.
6. Pin "Back to Basics" from the extensions puzzle menu.

---

## 9. Development Setup

### Prerequisites
- Node.js (v18.0.0 or higher)
- npm or pnpm

### Setup
```bash
git clone https://github.com/Ghostx003/back-to-basics.git
cd back-to-basics
npm install
```

---

## 10. Build Instructions

To build the production-ready extension into `dist/`:
```bash
npm run build
```
This runs TypeScript type checking (`tsc --noEmit`), compiles the popup, dashboard, and background service worker via Vite, and bundles the content script as a standalone IIFE.

---

## 11. Testing Instructions

Automated tests are powered by [Vitest](https://vitest.dev/) and Testing Library.

Run all tests once:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

Test coverage includes:
- Deadline calculations and drift prevention
- State transitions (Idle, RunningStudy, PausedStudy, RunningBreak, Completed)
- Stale alarm rejection and idempotency protection
- Pomodoro session progression and break skipping
- URL sanitization, scheme filtering, and clipboard fallback
- Form validation and modal confirmations

---

## 12. Permissions Explanation

Back to Basics follows the principle of least privilege:
- `storage`: Persists study schedules and active session state across browser restarts.
- `alarms`: Wakes the background service worker when session deadlines arrive.
- `tabs`: Tracks and controls exclusively the managed study tab.
- `host_permissions: <all_urls>`: Required to inject the break overlay and video controllers into user-configured study pages.

The extension never accesses personal browsing data, cookies, bookmarks, or history.

---

## 13. Known Browser and Website Limitations

- **Autoplay Restrictions**: Modern browsers restrict programmatic unmuting or video resumption without prior user interaction on that domain. If a website blocks autoplay resume, the extension presents a polite reminder.
- **Cross-Origin Iframes**: Video players hosted inside cross-origin `<iframe>` elements without permission delegations cannot be paused directly via DOM scripting.
- **Browser Internal Pages**: Chrome and Brave do not permit content scripts on internal pages such as `chrome://` or `brave://`.

---

## 14. Project Structure

```
back-to-basics/
├── dist/                      # Production extension build
├── public/
│   ├── manifest.json          # Manifest V3 configuration
│   └── icons/                 # Extension PNG icons (16, 32, 48, 128)
├── src/
│   ├── background/            # Service worker & state authority
│   │   ├── index.ts           # Orchestrator & message router
│   │   ├── session-manager.ts # Authoritative state machine
│   │   ├── alarms.ts          # Alarm scheduler & reconciliation
│   │   └── tabs-manager.ts    # Managed tab isolation
│   ├── content/               # Injected page interactions
│   │   ├── index.ts           # Content script coordinator
│   │   ├── break-overlay.ts   # Full-page Shadow DOM break screen
│   │   ├── video-controller.ts# Layered media pause/resume engine
│   │   ├── ticker.ts          # Web Audio synth ticking sound
│   │   └── navigation-guard.ts# Distraction detection prompt
│   ├── popup/                 # Compact extension popup
│   ├── dashboard/             # Expanded full-page configuration view
│   ├── components/            # UI components & forms
│   ├── shared/                # Types, messaging, and validation
│   └── storage/               # Storage wrapper with fallbacks
└── tests/                     # Vitest automated test suite
```

---

## 15. Troubleshooting

- **Timer did not switch tabs**: Check if Chrome has suspended tab discards for the active window or if the study tab was closed manually.
- **No ticking sound heard**: Verify that the sound toggle in the extension header is enabled and that your system volume is unmuted.
- **Clipboard paste button failed**: If your browser blocks clipboard read access, paste the URL manually using `Ctrl+V` or `Cmd+V`.

---

## 16. Contribution Instructions

Contributions are welcome!
1. Fork the repository.
2. Create your feature branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes (`git commit -m 'Add amazing feature'`).
4. Ensure all tests pass (`npm test && npm run build`).
5. Push to the branch (`git push origin feature/amazing-feature`).
6. Open a Pull Request.

---

## 17. License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
