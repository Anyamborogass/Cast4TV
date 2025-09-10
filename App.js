import { StatusBar } from "expo-status-bar";
import MainStack from "./navigation";

export default function App() {
  return (
    <>
      <StatusBar backgroundColor="#f4511e" barStyle="light-content" />

      <MainStack />
    </>
  );
}
