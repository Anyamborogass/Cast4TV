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
    const videoUrl = extractVideoURL(htmlContent);

    return videoUrl;
  } catch (err) {
    throw new Error(`Network error: ${err.message}`);
  }
};

const extractVideoURL = (htmlContent) => {
  console.log("* Trying to extract video URL...");

  // Matches both `"file":"..."` and `"file": "..."` (markup spacing varies).
  const pattern = /"file":\s*"(.*?)"/g;
  let match;
  while ((match = pattern.exec(htmlContent)) !== null) {
    console.log("* Searching for URL...");

    // The URL is JSON-escaped in the page (e.g. `https:\/\/...`). Unescape the
    // slashes but KEEP the full URL — including the `?v=5iip:<ip>` query token.
    // That token binds the stream to the requesting IP and is required for
    // playback (the stream is geo-restricted to Hungary); stripping it makes
    // the CDN reject the segments and the player renders a black screen.
    let urlString = match[1].replace(/\\\//g, "/").replace(/\\/g, "");

    // Skip ad / bumper / preroll entries — we only want the live content stream.
    if (/bumper|preroll|postroll/i.test(urlString)) {
      console.log("* Skipping ad/bumper URL");
      continue;
    }

    console.log("* We got a MATCH:", urlString);
    return urlString;
  }
  return null;
};
