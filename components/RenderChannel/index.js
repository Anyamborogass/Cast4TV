import { useState, useEffect, useRef, useCallback } from "react";
import { View, Text, Button, ActivityIndicator, StyleSheet } from "react-native";
import Video, { DRMType } from "react-native-video";
import useUrlStore from "../../zustand/useUrlStore";
import { useRemoteMediaClient } from "react-native-google-cast";
import { loadStreamToChromecast } from "../shared/loadStreamToChromecast";
import { fetchVideoURL } from "../shared/fetchVideoUrl";
import { useFocusEffect } from "@react-navigation/native";

const MAX_AUTO_RETRIES = 3;

const RenderChannel = ({ route }) => {
  const { channel } = route.params;

  const client = useRemoteMediaClient();

  const setUrl = useUrlStore((state) => state.setUrl);
  const getUrl = useUrlStore((state) => state.getUrl);

  const [videoURL, setVideoURL] = useState("");
  // M4's live stream is Widevine-encrypted DASH; this holds the license server
  // URL scraped alongside the manifest. Null for clear (DRM-free) streams.
  const [licenseServer, setLicenseServer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [buffering, setBuffering] = useState(false);
  const [error, setError] = useState("");

  const playerRef = useRef(null);
  const retryCount = useRef(0);

  useEffect(() => {
    // If we have both a Chromecast client and a stream URL, cast immediately
    if (client && videoURL) {
      loadStreamToChromecast({ client, url: videoURL });

      // Pause local player so you don’t double-play
      try {
        playerRef.current?.pause();
      } catch (error) {
        console.log("Error pausing local video:", error.message);
      }
    }
  }, [client, videoURL]);

  const playMedia = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // Always re-scrape so we get a fresh, IP-tokenized stream URL.
      const source = await fetchVideoURL({ channel });
      if (source?.url) {
        setVideoURL(source.url);
        setLicenseServer(source.licenseServer ?? null);
        setUrl(source.url);
      } else {
        setError("No suitable video URL found");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [channel, setUrl]);

  useFocusEffect(
    useCallback(() => {
      retryCount.current = 0;
      playMedia();
    }, [playMedia])
  );

  const handleRestart = () => {
    retryCount.current = 0;
    playMedia();
  };

  // The stream URL is bound to the viewer's IP via a token that can expire or
  // be rejected. Instead of leaving a black player, auto re-fetch a fresh URL
  // a few times before surfacing the error.
  //
  // EXCEPTION: DRM errors are fatal, not transient. The Widevine license server
  // returns a license that doesn't contain the content keys, so re-scraping
  // produces the same un-decryptable stream. Worse, the decrypt error fires
  // AFTER onLoad (which resets retryCount), so retrying here loops forever and
  // eventually crashes. Surface DRM failures immediately without retrying.
  const handleVideoError = (e) => {
    const err = e?.error ?? e;
    console.log("* Video playback error:", JSON.stringify(err));

    const isDrmError =
      String(err?.errorCode) === "26006" ||
      /DRM|license|crypto|key/i.test(String(err?.errorString ?? ""));

    if (isDrmError) {
      console.log("* DRM error — not retrying (license is missing content keys).");
      setError(
        "This channel is DRM-protected and can't be decrypted on this device. " +
          "Tap Restart Stream to try again."
      );
      return;
    }

    if (retryCount.current < MAX_AUTO_RETRIES) {
      retryCount.current += 1;
      console.log(`* Auto-retrying stream (${retryCount.current}/${MAX_AUTO_RETRIES})...`);
      playMedia();
    } else {
      setError("Stream failed to load. Tap Restart Stream to try again.");
    }
  };

  const handleLoad = () => {
    retryCount.current = 0;
    setBuffering(false);
  };

  const loadStream = () => {
    const url = getUrl();
    loadStreamToChromecast({ client, url });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#f4511e" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <View style={{ marginTop: 16 }}>
          <Button title="Restart Stream" onPress={handleRestart} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View>
        <Video
          ref={playerRef}
          source={{
            uri: videoURL,
            // v6 moved DRM config from the top-level `drm` prop into `source`.
            // The license endpoint is reached in Widevine privacy mode (enabled
            // natively via a service certificate in the patched DRMManager.kt);
            // these headers mirror the working web-player request.
            ...(licenseServer
              ? {
                  drm: {
                    type: DRMType.WIDEVINE,
                    licenseServer,
                    headers: {
                      Referer: "https://player.mediaklikk.hu/",
                      Origin: "https://player.mediaklikk.hu",
                    },
                  },
                }
              : {}),
          }}
          style={styles.video}
          controls={true}
          resizeMode="contain"
          onError={handleVideoError}
          onLoad={handleLoad}
          onBuffer={({ isBuffering }) => setBuffering(isBuffering)}
        />
        {buffering && (
          <View style={styles.bufferOverlay} pointerEvents="none">
            <ActivityIndicator size="large" color="#f4511e" />
          </View>
        )}
      </View>
      <View style={styles.buttons}>
        <Button title="Restart Stream" onPress={handleRestart} />
        <Button title="Load stream to device" onPress={loadStream} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "black" },
  centered: {
    flex: 1,
    backgroundColor: "black",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  video: { width: "100%", height: 300 },
  bufferOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 300,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: { color: "white", textAlign: "center", fontSize: 16 },
  buttons: { paddingHorizontal: 10, gap: 10, marginTop: 10 },
});

export default RenderChannel;
