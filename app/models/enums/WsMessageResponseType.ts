enum WsMessageResponseType {
  PONG = 'pong',

  P2P_OFFERED = 'p2p-offered',
  P2P_ANSWERED = 'p2p-answered',
  P2P_CANDIDATE_OFFERED = 'p2p-candidate-offered',
  P2P_CANDIDATE_ANSWERED = 'p2p-candidate-answered',
  CALLED = 'called',
  CALL_ACCEPTED = 'call-accepted',
  CALL_ACCEPTED_OC = 'call-accepted-oc',
  CALL_CANCELED = 'call-cancelled',
  CALL_DECLINED = 'call-declined',
  CALL_ENDED = 'call-ended',
  VIDEO_FROZEN = 'video-frozen',
};

export default WsMessageResponseType;
