"use client";

import Peer, { DataConnection } from "peerjs";

// Message types sent between host and players
export type PeerMessage =
  | { type: "player-joined"; playerId: string; name: string }
  | { type: "player-left"; playerId: string }
  | { type: "game-start" }
  | { type: "question"; data: PartyQuestionData }
  | { type: "answer"; playerId: string; answer: string; answeredAt: number; cluesUsed: number }
  | { type: "reveal"; data: PartyRevealData }
  | { type: "scoreboard"; players: PartyPlayerInfo[] }
  | { type: "game-end"; players: PartyPlayerInfo[] }
  | { type: "kick"; reason?: string };

export interface PartyClue {
  label: string;
  value: string;
}

export interface PartyQuestionData {
  text: string;
  options: string[];
  questionNumber: number;
  totalQuestions: number;
  isPoll: boolean;
  pollData?: { question: string; options: { text: string; votes: number }[] };
  timestamp: number; // message date as epoch ms
  timerDuration: number; // seconds
  timerStartedAt: number; // Date.now() on host
  clues: PartyClue[];
}

export interface ContextMessage {
  author: string;
  message: string;
  date: number; // epoch ms
  index: number;
  isTarget: boolean;
}

export interface PartyRevealData {
  correctAnswer: string;
  playerResults: Record<string, { isCorrect: boolean; points: number; total: number; speedBonus: number; cluePenalty: number }>;
  chatContext: ContextMessage[];
}

export interface PartyPlayerInfo {
  id: string;
  name: string;
  score: number;
  isCorrect?: boolean;
  streak: number;
}

// Generate a short room code (6 chars, alphanumeric uppercase)
function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1 to avoid confusion
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// Host: create a peer and listen for connections
export function createHostPeer(
  onPlayerConnect: (playerId: string, conn: DataConnection) => void,
  onReady: (peerId: string, roomCode: string) => void,
  onError: (err: Error) => void
): { peer: Peer; roomCode: string; destroy: () => void } {
  const roomCode = generateRoomCode();
  // Use roomCode as the peer ID prefix so players can connect by code
  const peerId = `whosaidit-${roomCode}`;

  const peer = new Peer(peerId);

  peer.on("open", () => {
    onReady(peerId, roomCode);
  });

  peer.on("connection", (conn) => {
    conn.on("open", () => {
      onPlayerConnect(conn.metadata?.playerId || conn.peer, conn);
    });
  });

  peer.on("error", (err) => {
    onError(err);
  });

  return {
    peer,
    roomCode,
    destroy: () => {
      peer.destroy();
    },
  };
}

// Player: connect to a host by room code
export function connectToHost(
  roomCode: string,
  playerName: string,
  onOpen: (conn: DataConnection, playerId: string) => void,
  onData: (msg: PeerMessage) => void,
  onClose: () => void,
  onError: (err: Error) => void
): { peer: Peer; destroy: () => void } {
  const playerId = `player-${Math.random().toString(36).slice(2, 8)}`;
  const peer = new Peer();
  const hostPeerId = `whosaidit-${roomCode.toUpperCase()}`;

  peer.on("open", () => {
    const conn = peer.connect(hostPeerId, {
      metadata: { playerId, name: playerName },
      reliable: true,
    });

    conn.on("open", () => {
      onOpen(conn, playerId);
    });

    conn.on("data", (data) => {
      onData(data as PeerMessage);
    });

    conn.on("close", () => {
      onClose();
    });

    conn.on("error", (err) => {
      onError(err);
    });
  });

  peer.on("error", (err) => {
    onError(err);
  });

  return {
    peer,
    destroy: () => {
      peer.destroy();
    },
  };
}
