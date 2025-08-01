// mqttClient.js
import mqtt from 'mqtt';

export function createMqttClient({ host, username, password, clientId }) {
  const client = mqtt.connect(host, {
    username,
    password,
    clientId: clientId || 'web_client_' + Math.random().toString(16).substr(2, 8),
    clean: true,
    reconnectPeriod: 1000,
    connectTimeout: 30000,
  });

  client.on('connect', () => {
    console.log(`✅ MQTT Connected to ${host}`);
  });

  client.on('error', (error) => {
    console.error('❌ MQTT Error:', error);
  });

  client.on('offline', () => {
    console.warn('📴 MQTT Offline');
  });

  client.on('close', () => {
    console.log('🔌 MQTT Closed');
  });

  return client;
}
