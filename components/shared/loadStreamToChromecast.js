import { MediaHlsSegmentFormat } from "react-native-google-cast";

const loadStreamToChromecast = ({ client, url }) => {
  if (client && url) {
    client.loadMedia({
      mediaInfo: {
        contentUrl: url,
        contentType: "application/x-mpegURL",
        hlsSegmentFormat: MediaHlsSegmentFormat.TS,
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
};

export { loadStreamToChromecast };
