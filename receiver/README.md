# Cast4TV custom Web Receiver

M4 Sport's live stream is **Widevine-protected DASH**. The Default Media
Receiver (`CC1AD845`) that `react-native-google-cast` uses out of the box
**cannot decrypt DRM content** — casting it fails with `idleReason: "error"`.

`index.html` in this folder is a minimal [CAF Web
Receiver](https://developers.google.com/cast/docs/web_receiver) that reads the
Widevine license server URL from the LOAD request's `media.customData` and
configures the receiver to fetch a license and decrypt the stream.

The app sends that `customData` from
[`components/shared/loadStreamToChromecast.js`](../components/shared/loadStreamToChromecast.js)
(`{ licenseUrl, licenseHeaders }`).

## One-time setup (only you can do these — they're tied to your Google account)

### 1. Host `receiver/index.html` at a stable HTTPS URL

It must be served over **HTTPS** (Cast requires it). Any static host works:

- **GitHub Pages** — commit `receiver/index.html`, enable Pages, use e.g.
  `https://<user>.github.io/<repo>/receiver/index.html`.
- **EAS Hosting**, Netlify, Vercel, Firebase Hosting, an S3 bucket, etc.

Verify the URL loads in a desktop browser (you'll see a black page — that's
correct; the `<cast-media-player>` only renders during a cast session).

### 2. Register it in the Cast SDK Developer Console

1. Go to <https://cast.google.com/publish> (one-time $5 developer registration
   if you don't have it).
2. **Add New Application → Custom Receiver.**
3. Paste the HTTPS URL from step 1 as the **Receiver Application URL**.
4. Save. Copy the generated **Application ID** (looks like `1A2B3C4D`).
5. Under **Cast Receiver → Devices**, register your Chromecast's serial number
   for testing. Publishing takes ~15 min to propagate; unpublished apps only
   work on registered devices.

### 3. Wire the App ID into the app

In [`app.json`](../app.json), replace the placeholder:

```json
["react-native-google-cast", { "receiverAppId": "REPLACE_WITH_YOUR_RECEIVER_APP_ID" }]
```

with your Application ID from step 2.

### 4. Rebuild the dev/native client

`receiverAppId` is baked into native config, so a JS reload is **not** enough:

```bash
eas build --profile dev
```

(or `npx expo prebuild --clean && npx expo run:android` for a local build).

## Testing / debugging

- Use the [Cast Command & Control (CaC)
  tool](https://casttool.appspot.com/cactool/) to send LOAD requests with
  arbitrary `customData` and watch receiver logs without rebuilding the app.
- Inspect the running receiver from your desktop Chrome at `chrome://inspect`
  (Chromecast must be on the same network). The receiver logs
  `[Cast4TV receiver] Widevine configured: <url>` on a successful LOAD.

## Caveats

- The `Referer`/`Origin` headers we forward are "forbidden" XHR headers that
  the receiver's browser may strip. connectmedia's DRM server primarily
  authorizes on the IP-bound token embedded in the manifest URL, so this is
  best-effort. If licensing fails, check the receiver console for the DRM
  response code.
- The manifest URL is bound to the **requesting IP**. The phone scrapes it and
  the Chromecast fetches it — both must be on the same network (same public IP)
  for the token to validate.
