# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Cast4TV (package name `m4chromecast`) is an Expo / React Native app that plays Hungarian
**M4 Sport** live TV channels and casts them to Chromecast devices. It scrapes the HLS stream
URL from `mediaklikk.hu` at runtime, plays it locally with `react-native-video`, and hands it
off to a Cast receiver via `react-native-google-cast`.

There is no test suite, lint config, or TypeScript — the codebase is plain JS with Expo defaults.

## Commands

```bash
expo start            # or: yarn start    — start Metro bundler
expo start --android  # or: yarn android
expo start --ios      # or: yarn ios
expo start --web      # or: yarn web
```

`react-native-google-cast` requires native code, so it **cannot run in Expo Go**. Use a
development build (`expo-dev-client` is installed). Builds are produced with EAS:

```bash
eas build --profile dev          # internal dev client (APK on Android)
eas build --profile production    # store production build (channel: production)
```

EAS project config lives in `eas.json` and `app.json` (`extra.eas.projectId`).

## Architecture

The whole app is four hand-written source files plus config:

- **`App.js`** — root component; renders the status bar and `MainStack`.
- **`navigation.js`** — a drawer navigator (`@react-navigation/drawer`) with one screen
  *per channel*. Each `Drawer.Screen` reuses the single `RenderChannel` component and passes
  the channel id via `initialParams={{ channel: "..." }}` (e.g. `mtv4live`, `mtv4plus`). The
  Chromecast `CastButton` is wired into each screen's `headerRight`. **To add a channel, add a
  `Drawer.Screen` here** — no other code changes are needed.
- **`components/RenderChannel/index.js`** — the core screen. On focus (`useFocusEffect`) it
  fetches the stream URL, plays it in a local `<Video>`, and — when a Cast client is connected
  (`useRemoteMediaClient`) — automatically loads the stream onto the Chromecast and pauses the
  local player to avoid double playback.
- **`components/shared/fetchVideoUrl.js`** — `fetchVideoURL({ channel })` requests the
  mediaklikk player page (with a spoofed browser `User-Agent`/`Referer` so the request is
  accepted) and regex-scrapes the `"file": "..."` HLS URL out of the returned HTML, skipping
  "bumper" (ad) URLs. **This scraping is brittle**: if upstream changes the page markup or
  headers, fix the regex/headers here.
- **`components/shared/loadStreamToChromecast.js`** — `loadStreamToChromecast({ client, url })`
  sends the HLS URL to the Cast receiver as `application/x-mpegURL` with TS segment format and
  M4 Sport metadata.

### State

`zustand/useUrlStore.js` is a single global store holding the most recently resolved stream
`url`. `RenderChannel` writes to it after a successful fetch and the "Load stream to device"
button reads from it to manually re-cast.

### Stream flow

```
channel id (route param)
  → fetchVideoURL()  scrapes mediaklikk player page → HLS url
  → setVideoURL (local <Video>) + setUrl (zustand store)
  → if Cast client connected: loadStreamToChromecast() + pause local player
```

## Notes

- `react-native-reanimated/plugin` must remain the **last** entry in `babel.config.js`.
- `app.json` forces `userInterfaceStyle: "dark"`; iOS declares `NSLocalNetworkUsageDescription`
  which is required for Cast device discovery.
