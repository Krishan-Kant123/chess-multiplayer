const { Server } = require("socket.io");
const http = require("http");
const express = require("express");
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const rooms = {};

io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on("joinRoom", ({ roomId, username }) => {
    socket.join(roomId);
    socket.data.username = username;
    socket.data.roomId = roomId;

    if (!rooms[roomId]) {
      rooms[roomId] = {
        white: null,
        black: null,
        turn: "white",
        fen: "start", 
      };
    }

    const room = rooms[roomId];

    // Handle reconnect: remove stale assignment
    if (room.white && room.white.id === socket.id) room.white = null;
    if (room.black && room.black.id === socket.id) room.black = null;

    let assignedRole = "viewer";

    if (!room.white) {
      room.white = { id: socket.id, username };
      assignedRole = "white";
    } else if (!room.black) {
      room.black = { id: socket.id, username };
      assignedRole = "black";
    }

    socket.emit("roleAssigned", assignedRole);
    socket.emit("turnUpdate", room.turn);
    socket.emit("fenUpdate", room.fen); 
    const playersData = {
      white: room.white ? room.white.username : null,
      black: room.black ? room.black.username : null,
    };

    console.log(`Room ${roomId} players:`, playersData);
    io.to(roomId).emit("playersUpdate", playersData);

    const gameStarted = !!(room.white && room.black);
    io.to(roomId).emit("gameStarted", gameStarted);
  });

  socket.on("chessMove", ({ roomId, move, by, fen }) => {
    const room = rooms[roomId];
    if (!room) return;

    const role = getRoleBySocketId(roomId, socket.id);
    if (!role || role === "viewer") {
      socket.emit("invalidMove", "Viewers can't move.");
      return;
    }

    if (role !== room.turn) {
      socket.emit("invalidMove", "It's not your turn.");
      return;
    }

 
    if (fen) {
      room.fen = fen;
    }

    io.to(roomId).emit("chessMove", { move, by });
    room.turn = room.turn === "white" ? "black" : "white";
    io.to(roomId).emit("turnUpdate", room.turn);
  });

  socket.on("chatMessage", ({ roomId, username, message }) => {
    io.to(roomId).emit("chatMessage", { username, message });
  });

  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);

    const roomId = socket.data.roomId;
    if (!roomId || !rooms[roomId]) return;

    const room = rooms[roomId];
    let changed = false;

    if (room.white && room.white.id === socket.id) {
      room.white = null;
      changed = true;
    }

    if (room.black && room.black.id === socket.id) {
      room.black = null;
      changed = true;
    }

    if (changed) {
      const playersData = {
        white: room.white ? room.white.username : null,
        black: room.black ? room.black.username : null,
      };

      io.to(roomId).emit("playersUpdate", playersData);
      io.to(roomId).emit("gameStarted", false);
    }

    if (!room.white && !room.black) {
      delete rooms[roomId];
      console.log(`Room ${roomId} deleted - no players left`);
    }
  });
});

function getRoleBySocketId(roomId, socketId) {
  const room = rooms[roomId];
  if (!room) return null;
  if (room.white && room.white.id === socketId) return "white";
  if (room.black && room.black.id === socketId) return "black";
  return "viewer";
}

server.listen(4000, () => {
  console.log("Server is listening on port 4000");
});
