import React from "react";
import { SocketProvider } from "../../context/SocketProvider";
import { useLocation } from 'react-router-dom';
import LobbyPage from './LobbyPage';
import './VideoConsultation.css';

const VideoConsultation = () => {
    const location = useLocation();

    const userData = location.state?.userData || null;
    const roomId = location.state?.roomId || null;


    return (
        <SocketProvider>
            <div className="app">
                <LobbyPage initialUser={userData} initialRoomId={roomId} />
            </div>
        </SocketProvider>
    );
};

export default VideoConsultation;
