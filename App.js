import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import * as ScreenOrientation from "expo-screen-orientation";
import MainStack from "./navigation";

export default function App() {
  useEffect(() => {
    // app.json declares orientation "default" so the OS *allows* landscape
    // (required for the video's fullscreen rotation). Keep the app itself
    // pinned to portrait here; RenderChannel temporarily unlocks to landscape
    // while the player is in fullscreen and re-locks on dismiss.
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
  }, []);

  return (
    <>
      <StatusBar backgroundColor="#f4511e" barStyle="light-content" />

      <MainStack />
    </>
  );
}
