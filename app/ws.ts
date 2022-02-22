import WebSocket from 'ws';
import { handleWithDBClient } from './db';
import SessionTokenRepository from './repositories/SessionTokenRepository';
import { addConnection, sendWsMessage, closeConnection, isConnected, p2pConnections, pendingCalls, sendSocketMessage, sendWsMessageExcept, buildWsMessage } from './services/WsService';
import ServiceDiscoveryRepo from './core/ServiceDiscoveryRepo';
import WsMessageType from './models/enums/WsMessageType';
import ChatService from './services/ChatService';
import { parseJson } from './utils';
import ChatRepository from './repositories/ChatRepository';
import LikeRepository from './repositories/LikeRepository';
import WsMessageResponseType from './models/enums/WsMessageResponseType';
import WsState from './models/enums/WsState';

type MessagePayload = { type: WsMessageType, payload: any };

const getAuthTokenFromUrl = (url: any) => {
  const ta = url.split('?');

  const found = ta[ta.length - 1]
    .split('&')
    .map((p: string) => p.split('='))
    .find((a: string[]) => a[0] === 'token');

  return found ? found[1] : null;
};

class WsConnection {
  private loggedUserId: string | undefined;

  static handle(ws: any, req: any) {
    return new WsConnection(ws, req);
  }

  constructor(private socket: any, req: any) {
    const token = getAuthTokenFromUrl(req.url);
    this.authenticate(token)
      .then((loggedUserId: string) => {
        this.loggedUserId = loggedUserId;
        addConnection(this.getLoggedUserId(), socket);
        console.log('WS c@', this.getLoggedUserId(), token);

        this.init();
      });

    socket.on('message', (message: string) => {
      if (!this.isLogged()) return;

      const messagePayload: MessagePayload = parseJson(message);
      this.onMessageReceived(messagePayload);
    });

    socket.on('close', () => this.onClose());
  }

  private init() {
    ServiceDiscoveryRepo.handleWithServiceDiscoveryContext(async (serviceDiscovery: any) => {
      const chatRepository: ChatRepository = await serviceDiscovery.get('chat_repository');
      const likesRepository: LikeRepository = await serviceDiscovery.get('likes_repository');

      const [
        notSeenMessagesCount,
        likesCount
      ] = await Promise.all([
        chatRepository.getAllNotSeenCount(this.getLoggedUserId()),
        likesRepository.getLikesCount(this.getLoggedUserId())
      ]);

      // console.log('notSeenMessagesCount:', notSeenMessagesCount);
      // console.log('likesCount:', likesCount);

      sendWsMessage(this.getLoggedUserId(), {
        type: WsMessageType.NOTIFS_COUNT,
        payload: {
          notSeenMessagesCount,
          likesCount
        }
      });
    });
  }

  onMessageReceived({ type, payload }: MessagePayload) {
    ServiceDiscoveryRepo.handleWithServiceDiscoveryContext(async (serviceDiscovery: any) => {
      const chatService: ChatService = await serviceDiscovery.get('chat_service');

      switch (type) {
        case WsMessageType.SEE_MSG: {
          await chatService.seeChatMessages(payload.chatId, this.getLoggedUserId());

          break;
        }
        case WsMessageType.MSG: {
          await chatService.createAndSend({ ...payload, userId: this.getLoggedUserId() });

          break;
        }
        case WsMessageType.PING: {
          this.sendMessage({
            type: WsMessageResponseType.PONG,
            payload: {}
          });

          break;
        }
        case WsMessageType.P2P_OFFER: {
          sendSocketMessage(
            p2pConnections.get(this.socket), buildWsMessage(WsMessageResponseType.P2P_OFFERED, {
              ...payload,
              callerId: this.loggedUserId
            }));

          break;
        }
        case WsMessageType.P2P_ANSWER: {
          sendSocketMessage(
            p2pConnections.get(this.socket), buildWsMessage(WsMessageResponseType.P2P_ANSWERED, payload.answer));

          break;
        }
        case WsMessageType.P2P_CANDIDATE_OFFER: {
          sendSocketMessage(p2pConnections.get(this.socket), buildWsMessage(WsMessageResponseType.P2P_CANDIDATE_OFFERED, payload.candidate));

          break;
        }
        case WsMessageType.P2P_CANDIDATE_ANSWER: {
          sendSocketMessage(p2pConnections.get(this.socket), buildWsMessage(WsMessageResponseType.P2P_CANDIDATE_ANSWERED, payload.candidate));

          break;
        }
        // case 'close':
        //   handleClose();

        //   break;
        case WsMessageType.CALL:
          pendingCalls.set(payload.calledId, this.socket);

          sendWsMessage(payload.calledId, buildWsMessage(WsMessageResponseType.CALLED, {
            ...payload,
            callerId: this.loggedUserId
          }));

          break;
        case WsMessageType.CALL_ACCEPT: {
          const remoteSocket = pendingCalls.get(this.loggedUserId);

          if (!remoteSocket) return;

          p2pConnections.set(remoteSocket, this.socket);
          p2pConnections.set(this.socket, remoteSocket);

          pendingCalls.delete(this.loggedUserId);

          const messagePayload = {
            ...payload,
            calledId: this.loggedUserId
          };
          for (const ws of [remoteSocket, this.socket]) {
            sendSocketMessage(ws, buildWsMessage(WsMessageResponseType.CALL_ACCEPTED, messagePayload));
          }
          sendWsMessageExcept(this.loggedUserId as string, this.socket, { type: WsMessageResponseType.CALL_ACCEPTED_OC, payload: {} });

          break;
        }
        case WsMessageType.CALL_CANCEL:
          sendWsMessage(payload.calledId, WsMessageResponseType.CALL_CANCELED);
        case WsMessageType.CALL_DECLINE:
          for (const userId of [payload.callerId, this.loggedUserId]) {
            sendWsMessage(userId, WsMessageResponseType.CALL_DECLINED);
          }

          break;
        case WsMessageType.CALL_END: {
          for (const ws of [p2pConnections.get(this.socket), this.socket]) {
            sendSocketMessage(ws, buildWsMessage(WsMessageResponseType.CALL_ENDED, payload));
          }

          break;
        }
        case WsMessageType.VIDEO_FROZEN: {
          sendSocketMessage(p2pConnections.get(this.socket), buildWsMessage(WsMessageResponseType.VIDEO_FROZEN));

          break;
        }
      }
    });
  }

  private onClose() {
    console.log('WS CLOSE');
    closeConnection(this.getLoggedUserId(), this.socket);
    if (isConnected(this.getLoggedUserId())) return;

    // setTimeout(() => {
    //   handleWithDBClient(async (client: any) => {
    //     if (isConnected(this.getLoggedUserId())) return;

    //     (new OnlineService(client)).setLastOnline(this.getLoggedUserId(), false);
    //   });
    // }, 10000);
  }

  private async authenticate(token: string): Promise<any> {
    return new Promise((resolve) => {
      handleWithDBClient(async (client: any) => {
        const sessionTokenRepository: SessionTokenRepository = new SessionTokenRepository(client);
        const loggedUserId: string = await sessionTokenRepository.getUserId(token);

        resolve(loggedUserId);
      });
    });
  }

  private isLogged(): boolean {
    return !!this.loggedUserId;
  }

  private getLoggedUserId(): string {
    return this.loggedUserId as string;
  }

  private sendMessage(message: { type: WsMessageResponseType, payload: any }) {
    if (!this.socket || this.socket.readyState != WsState.OPEN) return;

    this.socket.send(JSON.stringify(message));
  }
}

export const setUpWs = (server: any) => {
  const wss = new WebSocket.Server({ server });

  wss.on('connection', (ws, req) => {
    console.log('WS CONNECTED');
    WsConnection.handle(ws, req);
  });
};
