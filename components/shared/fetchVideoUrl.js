import axios from "axios";

export const fetchVideoURL = async ({ channel }) => {
  const url = `https://player.mediaklikk.hu/playernew/player.php?video=${channel}&noflash=yes`;

  try {
    console.log("* Sending request to mediaklikk...");

    const response = await axios.get(url, {
      headers: {
        Host: "player.mediaklikk.hu",
        "Sec-Fetch-Dest": "iframe",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        Referer: "https://m4sport.hu/",
        "Sec-Fetch-Site": "cross-site",
        "Sec-Fetch-Mode": "navigate",
        "Accept-Language": "en-GB,en;q=0.9",
        Priority: "u=0, i",
        Connection: "keep-alive",
      },
    });

    console.log("* Parsing HTML content...");
    const htmlContent = response.data;
    const source = extractVideoSource(htmlContent);

    return source;
  } catch (err) {
    throw new Error(`Network error: ${err.message}`);
  }
};

// The URL is JSON-escaped in the page (e.g. `https:\/\/...`). Unescape the
// slashes but KEEP the full URL — including the `?v=5sip:<ip>` query token.
// That token binds the stream to the requesting IP and is required for
// playback (the stream is geo-restricted to Hungary); stripping it makes
// the CDN reject the segments and the player renders a black screen.
const unescapeUrl = (raw) => raw.replace(/\\\//g, "/").replace(/\\/g, "");

const extractVideoSource = (htmlContent) => {
  console.log("* Trying to extract video URL...");

  // Each playlist entry looks like:
  //   "file":"https:\/\/...\/manifest.mpd?v=5sip:..","type":"dash",
  //   "drm":{"widevine":{"url":"https:\/\/drm.connectmedia.hu\/.../widevine"}}
  // M4's live stream is now Widevine-encrypted DASH, so we must capture the
  // license server URL alongside the manifest — without it ExoPlayer can't
  // decrypt the video and renders a black screen. The `drm` block is optional
  // (clear streams / bumper ads don't have one).
  const pattern =
    /"file":\s*"(.*?)"(?:\s*,\s*"type":\s*"[^"]*")?(?:\s*,\s*"drm":\s*\{\s*"widevine":\s*\{\s*"url":\s*"(.*?)"\s*\}\s*\})?/g;

  const candidates = [];
  let match;
  while ((match = pattern.exec(htmlContent)) !== null) {
    console.log("* Searching for URL...");

    const url = unescapeUrl(match[1]);
    const licenseServer = match[2] ? unescapeUrl(match[2]) : null;

    // Skip ad / bumper / preroll entries — we only want the live content stream.
    if (/bumper|preroll|postroll/i.test(url)) {
      console.log("* Skipping ad/bumper URL");
      continue;
    }

    candidates.push({ url, licenseServer });
  }

  if (candidates.length === 0) {
    return null;
  }

  // Prefer a clear HLS (.m3u8) variant when one is offered — it needs no DRM
  // session. Otherwise fall back to the (Widevine-protected) DASH manifest.
  const hls = candidates.find((c) => c.url.toLowerCase().includes(".m3u8"));
  const chosen = hls ?? candidates[0];

  console.log("* We got a MATCH:", chosen.url);
  if (chosen.licenseServer) {
    console.log("* Widevine license server:", chosen.licenseServer);
  }
  return chosen;
};
