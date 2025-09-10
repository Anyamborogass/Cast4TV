import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, Text, Button, ActivityIndicator } from "react-native";
import Video from "react-native-video";
import useUrlStore from "../../zustand/useUrlStore";
import { useRemoteMediaClient, useCastSession } from "react-native-google-cast";
import { loadStreamToChromecast } from "../shared/loadStreamToChromecast";
import { fetchVideoURL } from "../shared/fetchVideoUrl";
import { useFocusEffect } from "@react-navigation/native";

const RenderChannel = ({ route }) => {
  const { channel } = route.params;

  const client = useRemoteMediaClient();
  const castSession = useCastSession();

  const setUrl = useUrlStore((state) => state.setUrl);
  const getUrl = useUrlStore((state) => state.getUrl);

  const [videoURL, setVideoURL] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const playerRef = useRef(null);

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

  async function playMedia() {
    fetchVideoURL({ channel: channel })
      .then((videoURL) => {
        if (videoURL) {
          setVideoURL(videoURL);
          setUrl(videoURL);
          setLoading(false);
        } else {
          setError("No suitable video URL found");
          setLoading(false);
        }
      })
      .catch((error) => {
        setError(error.message);
        setLoading(false);
      });
  }

  useFocusEffect(
    useCallback(() => {
      playMedia();
    }, [])
  );

  const handleRestart = () => {
    playMedia();
  };

  const loadStream = () => {
    const url = getUrl();
    loadStreamToChromecast({ client: client, url: url });
  };

  if (loading) {
    return <ActivityIndicator size="large" color="#0000ff" />;
  }

  if (error) {
    return <Text>{error}</Text>;
  }

  return (
    <View style={{ flex: 1, backgroundColor: "black" }}>
      <Video
        ref={playerRef}
        source={{ uri: videoURL }}
        style={{ width: "100%", height: 300 }}
        controls={true}
        resizeMode="contain"
      />
      <View style={{ paddingHorizontal: 10, gap: 10 }}>
        <Button title="Restart Stream" onPress={handleRestart} />
        <Button title="Load stream to device" onPress={loadStream} />
      </View>
    </View>
  );
};

export default RenderChannel;
