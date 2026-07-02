import { useEffect, useCallback } from "react";
import { StatusBar } from "expo-status-bar";
import * as ScreenOrientation from "expo-screen-orientation";
import CastContext, { useCastChannel } from "react-native-google-cast";
import MainStack from "./navigation";

// Custom channel the receiver broadcasts its logs on. Must match DEBUG_NS in
// receiver/index.html. Lets us read receiver-side logs in Metro since
// chrome://inspect is blocked on Chromecast.
const DEBUG_NS = "urn:x-cast:com.cast4tv.debug";

export default function App() {
  // Print receiver-side logs (broadcast over DEBUG_NS) into Metro.
  useCastChannel(
    DEBUG_NS,
    useCallback((message) => {
      console.log("* [CAST][receiver]", JSON.stringify(message));
    }, [])
  );

  useEffect(() => {
    // app.json declares orientation "default" so the OS *allows* landscape
    // (required for the video's fullscreen rotation). Keep the app itself
    // pinned to portrait here; RenderChannel temporarily unlocks to landscape
    // while the player is in fullscreen and re-locks on dismiss.
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
  }, []);

  // DEBUG: trace the full Cast session lifecycle. When you tap the Cast button
  // and "nothing happens", the receiver (EC2D8F42) is failing to launch — this
  // logs WHERE it stops:
  //   onCastStateChanged: NotConnected → Connecting → (Connected | back to
  //     NotConnected). Falling back to NotConnected == launch/connect failed.
  //   onSessionStartFailed: fires with the error explaining WHY the receiver
  //     didn't launch (wrong/unpublished app id, device not authorized, etc.).
  //   onSessionStarted: receiver launched OK — problem is downstream (loadMedia).
  useEffect(() => {
    const sm = CastContext.getSessionManager();
    const subs = [
      CastContext.onCastStateChanged((state) =>
        console.log("* [CAST] castState:", state)
      ),
      sm.onSessionStarting(() => console.log("* [CAST] session STARTING")),
      sm.onSessionStarted((s) =>
        console.log("* [CAST] session STARTED, device:", s?.device?.friendlyName)
      ),
      sm.onSessionStartFailed((s, error) =>
        console.log("* [CAST] session START FAILED:", JSON.stringify(error))
      ),
      sm.onSessionSuspended(() => console.log("* [CAST] session SUSPENDED")),
      sm.onSessionResuming(() => console.log("* [CAST] session RESUMING")),
      sm.onSessionResumed(() => console.log("* [CAST] session RESUMED")),
      sm.onSessionEnding(() => console.log("* [CAST] session ENDING")),
      sm.onSessionEnded((s, error) =>
        console.log("* [CAST] session ENDED:", JSON.stringify(error ?? "no error"))
      ),
    ];
    return () => subs.forEach((sub) => sub?.remove?.());
  }, []);

  return (
    <>
      <StatusBar backgroundColor="#f4511e" barStyle="light-content" />

      <MainStack />
    </>
  );
}
