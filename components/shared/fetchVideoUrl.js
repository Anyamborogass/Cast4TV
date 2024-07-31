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

    const htmlContent = response.data;

    console.log("* Parsing HTML content...");
    const videoUrl = extractVideoURL(htmlContent);

    return videoUrl;
  } catch (err) {
    throw new Error(`Network error: ${err.message}`);
  }
};

const extractVideoURL = (htmlContent) => {
  console.log("* Trying to extract video URL...");

  const pattern = /"file": "(.*?)"/g;
  let match;
  while ((match = pattern.exec(htmlContent)) !== null) {
    console.log("* Searching for URL...");

    let urlString = match[1]
      .replace(/%5C\//g, "/")
      .replace(/\\/g, "")
      .replace(/\\/, "");
    urlString = decodeURIComponent(urlString);

    const questionMarkIndex = urlString.indexOf("?");
    if (questionMarkIndex !== -1) {
      urlString = urlString.substring(0, questionMarkIndex);

      console.log("* We got MATCH: ", urlString);
    }

    if (!urlString.toLowerCase().includes("bumper")) {
      return urlString;
    }
  }
  return null;
};
