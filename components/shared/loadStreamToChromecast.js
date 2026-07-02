import { MediaHlsSegmentFormat } from "react-native-google-cast";

// Headers our custom receiver forwards onto the Widevine license POST. Mirrors
// the working web-player license request. Best-effort only (see receiver code:
// Referer/Origin are forbidden XHR headers the browser may strip).
const LICENSE_HEADERS = {
  Referer: "https://player.mediaklikk.hu/",
  Origin: "https://player.mediaklikk.hu",
};

const loadStreamToChromecast = ({ client, url, licenseServer }) => {
  if (client && url) {
    const isDash = url.toLowerCase().includes(".mpd");

    // For Widevine DASH we hand the license server URL to the CUSTOM receiver
    // via customData. The receiver's LOAD interceptor reads `licenseUrl` and
    // configures a Widevine PlaybackConfig. Without a custom receiver app id
    // (app.json → react-native-google-cast → receiverAppId) this is ignored by
    // the Default Media Receiver and DRM playback fails with idleReason "error".
    const customData = licenseServer
      ? { licenseUrl: licenseServer, licenseHeaders: LICENSE_HEADERS }
      : undefined;

    console.log(
      "* [CAST] sending to receiver:",
      JSON.stringify({
        isDash,
        contentType: isDash ? "application/dash+xml" : "application/x-mpegURL",
        url,
        drm: !!licenseServer,
      })
    );

    // Return the promise so callers can await readiness / catch+retry.
    return client.loadMedia({
      mediaInfo: {
        contentUrl: url,
        contentType: isDash ? "application/dash+xml" : "application/x-mpegURL",
        // hlsSegmentFormat only applies to HLS streams.
        ...(isDash ? {} : { hlsSegmentFormat: MediaHlsSegmentFormat.TS }),
        ...(customData ? { customData } : {}),
        metadata: {
          images: [
            {
              url: "https://upload.wikimedia.org/wikipedia/hu/thumb/f/fd/M4_logo.png/1200px-M4_logo.png",
            },
          ],
          title: "M4 Sport",
          type: "user",
          mykey: "M4 Sport",
        },
      },
    });
  }

  return Promise.resolve();
};

export { loadStreamToChromecast };
