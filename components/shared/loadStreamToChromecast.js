import { MediaHlsSegmentFormat } from "react-native-google-cast";

const loadStreamToChromecast = ({ client, url }) => {
  if (client && url) {
    const isDash = url.toLowerCase().includes(".mpd");

    // Return the promise so callers can await readiness / catch+retry.
    return client.loadMedia({
      mediaInfo: {
        contentUrl: url,
        contentType: isDash ? "application/dash+xml" : "application/x-mpegURL",
        // hlsSegmentFormat only applies to HLS streams.
        ...(isDash ? {} : { hlsSegmentFormat: MediaHlsSegmentFormat.TS }),
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
