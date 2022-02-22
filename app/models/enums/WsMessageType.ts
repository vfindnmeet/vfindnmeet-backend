enum WsMessageType {
  LIKED = 'liked',
  MSG = 'msg',
  NOTIFS_COUNT = 'notifs_count',
  MSGS = 'msgs',
  SEE_INTROS = 'see_intros',
  SEE_MSG = 'see_msg',
  NOTIF = 'notif',
  SEE_VISITS = 'see_visits',
  SEE_MATCHES = 'see_matches',
  PING = 'ping',

  P2P_OFFER = 'p2p-offer',
  P2P_ANSWER = 'p2p-answer',
  P2P_CANDIDATE_OFFER = 'p2p-candidate-offer',
  P2P_CANDIDATE_ANSWER = 'p2p-candidate-answer',
  CALL = 'call',
  CALL_ACCEPT = 'call-accept',
  CALL_CANCEL = 'call-cancel',
  CALL_DECLINE = 'call-decline',
  CALL_END = 'call-end',
  VIDEO_FROZEN = 'video-frozen',
};

export default WsMessageType;
