# NFC Tag Writer, Digital Wallet Passes (.pkpass), and Android HCE Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a complete, multi-tiered NFC and Digital Wallet expansion across three phases: (1) NFC Tag Writer modal for writing data to physical blank tags (NTAG213/215/216/CUID) via Web NFC, (2) Apple Wallet (.pkpass) and Google Wallet pass generator and viewer for digital credential passes, and (3) Android Native Host Card Emulation (HCE) service enabling phones to emulate smart cards for compatible NFC readers.

**Architecture:** 
- **Fase 1 (Web NFC Writer):** A dedicated React modal (`CardNfcWriterModal.jsx`) using `window.NDEFReader.write()` with multiple payload modes (UID, Web Pass Link, Smart Lock Text, and CUID instructions), radar animation, and simulated fallback.
- **Fase 2 (Digital Wallet Pass Engine):** A pure client-side wallet pass generator (`src/lib/walletPass.js`) creating standard Apple Wallet `pass.json` and `.pkpass` ZIP bundles, Google Wallet save links, and an interactive Apple Wallet style modal (`CardWalletPassModal.jsx`).
- **Fase 3 (Android Native HCE):** Android `HostApduService` (`KeptCardEmulationService.java`) with `apduservice.xml` AID routing, exposed through a Capacitor plugin (`KeptHcePlugin.java`) and JS bridge (`src/lib/hce.js`), integrated into `CardTapModal.jsx` for active tap emulation.

**Tech Stack:** React 19, Web NFC API (`NDEFReader`), Web Cryptography / SHA-1 hashing, Capacitor 8 (Android SDK, Java), CSS3 motion / radar animations, Node.js health-check suite.

**Spec:** User request: "fase 1 sampai 3" covering:
1. NFC Tag Writer (`ndef.write()` to blank NTAG213/215/216 stickers)
2. Digital Wallet Pass (.pkpass / Apple Wallet & Google Wallet)
3. Android Native HCE (Host Card Emulation for smart reader taps)

---

## Global Constraints
- Preserve zero-knowledge encryption guarantees and local vault security.
- Maintain compatibility with desktop, iOS Web/PWA, Android Web/PWA, and Capacitor native builds.
- Keep `npm test` passing with 100% test pass rate across all 5 Testing Levels.
- Ensure all Android native code compiles cleanly with `./gradlew assembleDebug`.

---

## Review Focus
1. Web NFC permission handling and graceful degradation when browser lacks `NDEFReader`.
2. Integrity of `.pkpass` ZIP structure and JSON schema conforming to Apple PassKit specifications.
3. Android `HostApduService` memory management, lifecycle, and AID routing without blocking UI threads.
4. Multilingual support (Indonesian & English) for all new UI buttons, badges, and modals.
5. Touch UX and haptic feedback consistency across all interactive NFC/Wallet dialogs.

---

## Tasks

### Task 1: Fase 1 — Implement NFC Tag Writer Modal (`CardNfcWriterModal.jsx`)
- [ ] Create `src/components/CardNfcWriterModal.jsx` with Web NFC `NDEFReader.write()` integration.
- [ ] Implement payload selection: Text UID, Web URL Pass, Smart Lock Key, and CUID Guide.
- [ ] Add simulation mode for cross-platform testing (desktop, iOS, and non-Chromium browsers).
- [ ] Add i18n translation keys in `src/lib/i18n.js` (ID & EN).
- [ ] Add styles in `src/styles.css` for writer modal, target payload pills, write animations, and status feedback.
- [ ] Hook the "Tulis ke Tag NFC" button into `src/components/CardDetailModal.jsx`.

### Task 2: Fase 2 — Implement Digital Wallet Pass Engine & Apple Wallet Modal
- [ ] Create `src/lib/walletPass.js` for Apple Wallet `pass.json` generation, client-side ZIP packager, and Google Wallet formatters.
- [ ] Create `src/components/CardWalletPassModal.jsx` featuring an interactive Apple Wallet card preview, barcode/QR renderer, and download buttons (`.pkpass`, JSON, and Google Wallet).
- [ ] Add i18n keys for Wallet Pass actions and notices in `src/lib/i18n.js`.
- [ ] Add styles in `src/styles.css` for Apple Wallet pass preview, flip effect, and badge styling.
- [ ] Hook "Simpan ke Apple Wallet / Digital Pass" into `src/components/CardDetailModal.jsx`.

### Task 3: Fase 3 — Implement Android Native Host Card Emulation (HCE)
- [ ] Create `android/app/src/main/res/xml/apduservice.xml` with Kept custom AID (`F0010203040506`).
- [ ] Update `android/app/src/main/AndroidManifest.xml` with NFC permissions, HCE feature flag, and `KeptCardEmulationService` declaration.
- [ ] Create `android/app/src/main/java/com/kept/app/KeptCardEmulationService.java` implementing ISO 7816-4 APDU command processing.
- [ ] Create `android/app/src/main/java/com/kept/app/KeptHcePlugin.java` exposing HCE control to JavaScript.
- [ ] Register `KeptHcePlugin` in `android/app/src/main/java/com/kept/app/MainActivity.java`.
- [ ] Create JavaScript bridge `src/lib/hce.js` with fallback for web/iOS.
- [ ] Upgrade `src/components/CardTapModal.jsx` to support real-time active HCE activation on Android devices.

### Task 4: Verification, Testing & Build
- [ ] Update `scripts/health-check.mjs` to include verification for NFC Writer, Wallet Pass generation, and HCE module integrity.
- [ ] Run `npm test` and verify 100% PASS across all 5 Testing Levels.
- [ ] Run `npm run build` and verify web bundle builds cleanly without errors.
