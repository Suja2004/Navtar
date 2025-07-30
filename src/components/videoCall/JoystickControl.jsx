import { useState, useRef, useEffect } from 'react';
import './JoystickControl.css';
import mqttClient from './mqttClient';

function JoystickControl() {
  const [botStatus, setBotStatus] = useState('Waiting for Bot'); // Internal bot status
  const [obstacleStatus, setObstacleStatus] = useState(null); // Obstacle info text or null
  const joystickRef = useRef(null);
  const handleRef = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [speed, setSpeed] = useState(0);
  const [direction, setDirection] = useState('Stopped');
  const [robotStatus, setRobotStatus] = useState('Calibrating...');
  const [mqttStatus, setMqttStatus] = useState('Connecting...');

  // MQTT connection and message handlers
  useEffect(() => {
    let isSubscribed = false;

    const handleConnect = () => {
      // console.log('✅ MQTT connected');
      setMqttStatus('Connected');

      setTimeout(() => {
        if (mqttClient.connected && !isSubscribed) {
          mqttClient.subscribe('bot/status', (err) => {
            if (!err) {
              console.log('✅ Subscribed to bot/status');
              isSubscribed = true;
            } else {
              console.error('❌ Subscription error:', err);
            }
          });
        }
      }, 100);
    };

    const handleDisconnect = () => {
      // console.log('❌ MQTT disconnected');
      setMqttStatus('Disconnected');
      setBotStatus('Waiting for Bot');
      setObstacleStatus(null);
      isSubscribed = false;
    };

    const handleError = (error) => {
      console.error('❌ MQTT Error:', error);
      setMqttStatus('Error');
    };

    const handleMessage = (topic, message) => {
      const msgStr = message.toString();
      // console.log('📨 Received message:', topic, msgStr);

      if (topic === 'bot/status') {
        if (msgStr.startsWith('Obstacle detected at:')) {
          // Parse obstacle message
          const parts = msgStr.replace('Obstacle detected at:', '').trim();
          if (parts === '') {
            setObstacleStatus(null); // No obstacles info
          } else {
            setObstacleStatus(parts); // e.g. "front left right"
          }
        } else {
          // Normal bot status messages
          if (msgStr === 'connected') {
            setBotStatus('Ready');
            setObstacleStatus(null);
          } else if (msgStr === 'moving') {
            setBotStatus('Moving');
          } else if (msgStr === 'stopped') {
            setBotStatus('Idle');
          } else if (msgStr === 'disconnected') {
            setBotStatus('Disconnected');
            setObstacleStatus(null);
          } else {
            // Clear obstacle info on unknown messages to avoid stale display
            setObstacleStatus(null);
          }
        }
      }
    };

    mqttClient.on('connect', handleConnect);
    mqttClient.on('disconnect', handleDisconnect);
    mqttClient.on('error', handleError);
    mqttClient.on('message', handleMessage);

    // If already connected when component mounts
    if (mqttClient.connected) {
      handleConnect();
    }

    return () => {
      mqttClient.off('connect', handleConnect);
      mqttClient.off('disconnect', handleDisconnect);
      mqttClient.off('error', handleError);
      mqttClient.off('message', handleMessage);
    };
  }, []);

  // Calculate speed and direction based on joystick position
  useEffect(() => {
    const distance = Math.sqrt(position.x ** 2 + position.y ** 2);
    const maxDistance = 50;
    let normalizedSpeed = Math.min(Math.round((distance / maxDistance) * 100), 100);

    // Dead zone < 15% means stop
    if (normalizedSpeed < 15) normalizedSpeed = 0;

    setSpeed(normalizedSpeed);

    let newDirection = 'Stopped';
    if (normalizedSpeed > 0) {
      const angle = Math.atan2(-position.y, position.x) * (180 / Math.PI);
      if (angle >= -22.5 && angle < 22.5) newDirection = 'Right';
      else if (angle >= 22.5 && angle < 67.5) newDirection = 'Forward-Right';
      else if (angle >= 67.5 && angle < 112.5) newDirection = 'Forward';
      else if (angle >= 112.5 && angle < 157.5) newDirection = 'Forward-Left';
      else if (angle >= 157.5 || angle < -157.5) newDirection = 'Left';
      else if (angle >= -157.5 && angle < -112.5) newDirection = 'Backward-Left';
      else if (angle >= -112.5 && angle < -67.5) newDirection = 'Backward';
      else if (angle >= -67.5 && angle < -22.5) newDirection = 'Backward-Right';
    }

    setDirection(newDirection);
    setRobotStatus(normalizedSpeed > 0 ? 'Moving' : 'Ready');

    if (mqttClient.connected) {
      const command = {
        direction: normalizedSpeed === 0 ? 'Stop' : newDirection,
        speed: normalizedSpeed,
      };

      mqttClient.publish('robot/control', JSON.stringify(command), (err) => {
        if (!err) {
          console.log('📤 Published command:', command);
        } else {
          console.error('❌ Publish error:', err);
        }
      });
    }
  }, [position]);

  // Joystick event handlers
  const handleStart = (x, y) => {
    if (!joystickRef.current) return;
    setIsDragging(true);
    const rect = joystickRef.current.getBoundingClientRect();
    updateHandlePosition(x, y, rect);
  };

  const handleMove = (x, y) => {
    if (!isDragging || !joystickRef.current) return;
    const rect = joystickRef.current.getBoundingClientRect();
    updateHandlePosition(x, y, rect);
  };

  const updateHandlePosition = (x, y, rect) => {
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    let dx = x - rect.left - centerX;
    let dy = y - rect.top - centerY;
    const distance = Math.sqrt(dx ** 2 + dy ** 2);
    const maxDistance = 50;

    if (distance > maxDistance) {
      const angle = Math.atan2(dy, dx);
      dx = Math.cos(angle) * maxDistance;
      dy = Math.sin(angle) * maxDistance;
    }
    setPosition({ x: dx, y: dy });
  };

  const handleEnd = () => {
    setIsDragging(false);
    setPosition({ x: 0, y: 0 });

    if (mqttClient.connected) {
      const stopCmd = { direction: 'Stop', speed: 0 };
      mqttClient.publish('robot/control', JSON.stringify(stopCmd));
      setTimeout(() => {
        mqttClient.publish('robot/control', JSON.stringify(stopCmd));
      }, 150);
    }
  };

  // Mouse and touch event wrappers
  const onMouseDown = e => handleStart(e.clientX, e.clientY);
  const onMouseMove = e => handleMove(e.clientX, e.clientY);
  const onMouseUp = () => handleEnd();
  const onTouchStart = e => e.touches[0] && handleStart(e.touches[0].clientX, e.touches[0].clientY);
  const onTouchMove = e => e.touches[0] && handleMove(e.touches[0].clientX, e.touches[0].clientY);
  const onTouchEnd = () => handleEnd();

  // Attach/detach listeners based on dragging state
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      document.addEventListener('touchmove', onTouchMove);
      document.addEventListener('touchend', onTouchEnd);
    }
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [isDragging]);

  // Combined connection status display logic
  let connectionClass = '';
  let connectionText = '';

  if (mqttStatus === 'Connected' && botStatus === 'Ready') {
    connectionClass = 'status-connected';
    connectionText = 'Navtar is Ready';
  } else if (mqttStatus === 'Connected' && botStatus !== 'Ready') {
    connectionClass = 'status-connecting';
    connectionText = 'Navtar is Connecting...';
  } else if (mqttStatus === 'Connecting' || mqttStatus === 'Error') {
    connectionClass = 'status-connecting';
    connectionText = 'Navtar is Connecting...';
  } else {
    connectionClass = 'status-disconnected';
    connectionText = 'Navtar Disconnected';
  }

  return (
    <div className="joystick-container">
      <div className={`navatar-connection-status ${connectionClass}`}>
        {connectionText}

        <div className={`obstacle-status-box ${obstacleStatus ? 'obstacle-present' : 'no-obstacle'}`}>
          {obstacleStatus ? (
            <>
              <strong>Obstacle detected at:</strong> {obstacleStatus}
            </>
          ) : (
            'No obstacles detected'
          )}
        </div>
      </div>

      <div className="joystick-stats">
        <div className="stat">
          <span className="stat-label">Direction:</span>
          <span className="stat-value">{direction}</span>
        </div>
      </div>

      <div
        className="joystick-base"
        ref={joystickRef}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
      >
        <div className="joystick-direction-indicator forward">▲</div>
        <div className="joystick-direction-indicator right">▶</div>
        <div className="joystick-direction-indicator backward">▼</div>
        <div className="joystick-direction-indicator left">◀</div>

        <div
          ref={handleRef}
          style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
          className={` joystick-handle ${botStatus} === 'Ready' ? ready : waiting`}
        ></div>
      </div>

      <div className="control-instructions">
        <p>Click and drag joystick to navigate Navtar</p>
        <p>Release to stop movement</p>
      </div>
    </div>
  );
}

export default JoystickControl;
