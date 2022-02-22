import WsState from "../models/enums/WsState";

export type WsMessage = {
  type: string;
  payload: { [key: string]: any };
};

const wsConnections: { [key: string]: any } = {};

export const p2pConnections = new WeakMap();
export const pendingCalls = new Map();

export const buildWsMessage = (type: string, payload: { [key: string]: any } = {}) => ({
  type,
  payload
});

export const addConnection = (userId: string, ws: any) => {
  if (!wsConnections[userId]) {
    wsConnections[userId] = {
      connections: []
    };
  }
  wsConnections[userId].connections.push(ws);
};

export const closeConnection = (userId: string, ws: any) => {
  if (!wsConnections[userId] || !wsConnections[userId].connections) return;

  for (let i = 0; i < wsConnections[userId].connections.length; i++) {
    if (ws === wsConnections[userId].connections[i]) {
      wsConnections[userId].connections.splice(i, 1);

      break;
    }
  }

  if (0 === wsConnections[userId].connections.length) {
    delete wsConnections[userId];
  }
};

export const sendWsMessage = (userId: string, data: any) => {
  console.log('send => ' + userId);
  if (!wsConnections[userId]) {
    console.log('no conn for ', userId);
    return;
  }

  wsConnections[userId].connections.forEach((connection: any) => {
    // connection.send(JSON.stringify(data));
    sendSocketMessage(connection, data);
  });
};

export const sendWsMessageExcept = (userId: string, exceptSocket: any, message: WsMessage) => {
  if (!wsConnections[userId]) return;

  wsConnections[userId].connections.forEach((connection: any) => {
    if (connection === exceptSocket) return;

    sendSocketMessage(connection, message);
  });
}

export const sendSocketMessage = (ws: any, message: WsMessage) => {
  if (!ws) return;

  ws.send(JSON.stringify(message));
};

export const isConnected = (userId: string) => {
  if (!wsConnections[userId]) return false;

  for (const conn of wsConnections[userId].connections) {
    if (conn.readyState == WsState.OPEN) return true;
  }

  return false;
};
