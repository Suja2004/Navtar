import React, { useState, useRef, useEffect } from "react";
import { useSocket } from "../../context/SocketProvider";
import { Mic, MicOff, Video, VideoOff } from "lucide-react";
import ConferencePage from "./ConferencePage";
import { useNavigate } from "react-router-dom";
import JoystickControl from "./JoystickControl";

const LobbyPage = ({ initialUser, initialRoomId }) => {
  const [name, setName] = useState(initialUser?.name || "");
  const [roomId, setRoomId] = useState(initialRoomId || "");
  const [user, setUser] = useState(initialUser || null);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [previewStream, setPreviewStream] = useState(null);
  const [hasJoined, setHasJoined] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);

  const videoRef = useRef(null);
  const socket = useSocket();
  const navigate = useNavigate();
  const containerRef = useRef(null);

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        setPreviewStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch((err) => {
        console.error("Error accessing media devices:", err);
      });

    return () => {
      previewStream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const handleJoin = () => {
    if (name.trim() && roomId) {
      const userData = {
        name: name.trim(),
        email: `${name.trim()}@conference.com`,
        isVideoOn,
        isAudioOn,
      };
      setUser(userData);
      setHasJoined(true);
    }
  };

  const handleLeave = () => {
    setUser(null);
    setRoomId("");
    setHasJoined(false);
    navigate("/booking");
  };

  // const generateRoomId = () => {
  //   const id = Math.random().toString(36).substring(2, 12);
  //   setRoomId(id);
  // };

  const toggleVideo = async () => {
    if (isVideoOn && previewStream) {
      const videoTrack = previewStream.getVideoTracks()[0];
      if (videoTrack) videoTrack.stop();

      const newStream = new MediaStream(previewStream.getAudioTracks());
      setPreviewStream(newStream);
      if (videoRef.current) videoRef.current.srcObject = newStream;
      setIsVideoOn(false);
    } else {
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        const updatedStream = new MediaStream([
          ...(previewStream?.getAudioTracks() || []),
          ...newStream.getVideoTracks(),
        ]);
        setPreviewStream(updatedStream);
        if (videoRef.current) videoRef.current.srcObject = updatedStream;
        setIsVideoOn(true);
      } catch (err) {
        console.error("Error re-enabling video:", err);
      }
    }
  };

  const toggleAudio = () => {
    if (previewStream) {
      const audioTrack = previewStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isAudioOn;
      }
    }
    setIsAudioOn((prev) => !prev);
  };

  const toggleFullScreen = () => {
    const el = containerRef.current;

    if (!document.fullscreenElement) {
      if (el.requestFullscreen) el.requestFullscreen();
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
      else if (el.msRequestFullscreen) el.msRequestFullscreen();
      setFullScreen(true);
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      else if (document.msExitFullscreen) document.msExitFullscreen();
      setFullScreen(false);
    }
  };

  if (hasJoined && user) {
    return (
      <div ref={containerRef} className="conference-page">
        <ConferencePage
          user={user}
          room={roomId}
          onLeave={handleLeave}
          fullScreen={fullScreen}
          toggleFullScreen={toggleFullScreen}
        />
        <JoystickControl
          mqttConfig={{
            host: 'wss://a9088c6daa9e41e4b8f965ad7fd902a5.s1.eu.hivemq.cloud:8884/mqtt',
            username: 'yogin',
            password: 'Yogin@2004',
            clientId: 'web_client_' + Math.random().toString(16).substr(2, 8),
          }}
        />
      </div>
    );
  }

  return (
    <div className="lobby-container">
      <div className="lobby-card">
        <div className="preview-section">
          <h1 className="lobby-title">Video Conference</h1>

          <div className="video-preview">
            <video
              ref={videoRef}
              autoPlay
              muted
              className={`preview-video ${!isVideoOn ? "video-off" : ""}`}
            />
            {!isVideoOn && (
              <div className="video-placeholder">
                <div className="avatar">
                  {name.charAt(0).toUpperCase() || "U"}
                </div>
              </div>
            )}
          </div>

          <div className="preview-controls">
            <button
              className={`control-btn ${isVideoOn ? "active" : "inactive"}`}
              onClick={toggleVideo}
            >
              {isVideoOn ? <Video /> : <VideoOff />}
            </button>

            <button
              className={`control-btn ${isAudioOn ? "active" : "inactive"}`}
              onClick={toggleAudio}
            >
              {isAudioOn ? <Mic /> : <MicOff />}
            </button>
          </div>
        </div>

        <div className="form-section">
          <input
            type="text"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-field"
          />

          <div className="room-input-group">
            <input
              type="text"
              placeholder="Enter room ID"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="input-field"
            />
            {/* <button onClick={generateRoomId} className="generate-btn">
              Generate
            </button> */}
          </div>

          <button
            onClick={handleJoin}
            disabled={!name.trim() || !roomId}
            className="join-btn"
          >
            Join Conference
          </button>
        </div>
      </div>
    </div>
  );
};

export default LobbyPage;
