import { useState, useEffect, useRef, useCallback } from "react";
import { View, Text, Button, ActivityIndicator, StyleSheet } from "react-native";
import Video, { DRMType } from "react-native-video";
import useUrlStore from "../../zustand/useUrlStore";
import { useRemoteMediaClient } from "react-native-google-cast";
import { loadStreamToChromecast } from "../shared/loadStreamToChromecast";
import { fetchVideoURL } from "../shared/fetchVideoUrl";
import { useFocusEffect } from "@react-navigation/native";
import * as ScreenOrientation from "expo-screen-orientation";

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

  // DEBUG: log everything the receiver reports back over the cast channel.
  // The phone's console never sees the TV's own console.log, but it DOES see
  // media-status updates — including the idleReason that tells us WHY the
  // receiver stopped (e.g. "error" = load/decrypt failure on the TV).
  useEffect(() => {
    if (!client) return;
    console.log("* [CAST] client connected — subscribing to media status");
    const sub = client.onMediaStatusUpdated((status) => {
      console.log(
        "* [CAST] status:",
        JSON.stringify({
          playerState: status?.playerState,
          idleReason: status?.idleReason,
          contentType: status?.mediaInfo?.contentType,
          contentUrl: status?.mediaInfo?.contentUrl,
        })
      );
    });
    return () => sub?.remove?.();
  }, [client]);

  useEffect(() => {
    // If we have both a Chromecast client and a stream URL, cast immediately.
    if (!client || !videoURL) return;

    // The moment `client` first appears the receiver app has often just
    // launched and isn't ready to accept loadMedia yet — that single call
    // fails silently and you're left staring at a blank TV. Retry a few times
    // with a short backoff so connecting via the Cast button is a single step:
    // tap to connect → stream auto-loads, no "Load stream to device" needed.
    let cancelled = false;
    let attempt = 0;

    const tryLoad = () => {
      if (cancelled) return;
      attempt += 1;
      loadStreamToChromecast({ client, url: videoURL, licenseServer })
        .then(() => {
          if (cancelled) return;
          // Pause local player so you don't double-play.
          try {
            playerRef.current?.pause();
          } catch (error) {
            console.log("Error pausing local video:", error.message);
          }
        })
        .catch((err) => {
          console.log(
            `Auto-cast load failed (attempt ${attempt}):`,
            err?.message ?? err
          );
          if (!cancelled && attempt < MAX_AUTO_RETRIES) {
            setTimeout(tryLoad, 600 * attempt);
          }
        });
    };

    tryLoad();

    return () => {
      cancelled = true;
    };
  }, [client, videoURL, licenseServer]);

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

  // The app is pinned to portrait (see App.js). When the user enters the
  // video's native fullscreen, unlock to landscape so the stream fills the
  // screen; re-lock to portrait when fullscreen is dismissed.
  const handleFullscreenWillPresent = () => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
  };

  const handleFullscreenWillDismiss = () => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
  };

  const loadStream = () => {
    const url = getUrl();
    loadStreamToChromecast({ client, url, licenseServer });
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
            // These headers mirror the working web-player license request.
            //
            // multiDrm: true is REQUIRED here. M4's live DASH uses SEPARATE
            // Widevine KIDs for the video and audio tracks. With the default
            // (multiDrm=false) ExoPlayer opens a single DRM session keyed to the
            // first track's PSSH (video), so the license it fetches only contains
            // the video key. The audio renderer then fails to decrypt with
            // "Provided content key is not in license" (ERROR_DRM_NO_LICENSE,
            // errorCode 26006) a couple seconds in. multiDrm=true makes ExoPlayer
            // open one session per KID and fetch both the video and audio keys.
            ...(licenseServer
              ? {
                  drm: {
                    type: DRMType.WIDEVINE,
                    licenseServer,
                    multiDrm: true,
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
          onFullscreenPlayerWillPresent={handleFullscreenWillPresent}
          onFullscreenPlayerWillDismiss={handleFullscreenWillDismiss}
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
