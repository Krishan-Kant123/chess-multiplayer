
import { Chessboard } from "react-chessboard";
import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import io from "socket.io-client";
import Chat from "./Chat";
import { Chess } from "chess.js";
import "./Room.css";
import toast from "react-hot-toast";

// const SOCKET_SERVER_URL = "http://localhost:4000";
const SOCKET_SERVER_URL = "https://chess-multiplayer-rhci.onrender.com";

const Room = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const username = localStorage.getItem("username") || "";
  const [role, setRole] = useState(null);
  const [turn, setTurn] = useState("white");
  const [fen, setFen] = useState("start");
  const [highlightSquares, setHighlightSquares] = useState({});
  const [boardWidth, setBoardWidth] = useState(400);
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [players, setPlayers] = useState({ white: null, black: null });
  const [gameStarted, setGameStarted] = useState(false);
  const socketRef = useRef(null);
  const chessRef = useRef(new Chess());
  const containerRef = useRef(null);

  useEffect(() => {
    const calculateBoardWidth = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const padding = 32;
        const maxWidth = Math.min(containerWidth - padding, 400);
        setBoardWidth(Math.max(maxWidth, 280));
      }
    };

    calculateBoardWidth();
    window.addEventListener("resize", calculateBoardWidth);
    return () => window.removeEventListener("resize", calculateBoardWidth);
  }, []);

  useEffect(() => {
    if (!username) {
      navigate("/");
      return;
    }

    socketRef.current = io(SOCKET_SERVER_URL);
    socketRef.current.emit("joinRoom", { roomId, username });

    const rejoin = () => {
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit("joinRoom", { roomId, username });
      }
    };

    socketRef.current.on("connect", rejoin);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        rejoin();
      }
    });

    socketRef.current.on("roleAssigned", (assignedRole) => {
      setRole(assignedRole);
      toast.success(`You're playing as ${assignedRole}`);
    });

    socketRef.current.on("turnUpdate", (newTurn) => {
      setTurn(newTurn);
    });

    socketRef.current.on("fenUpdate", (savedFen) => {
      if (savedFen && savedFen !== "start") {
        chessRef.current.load(savedFen);
        setFen(savedFen);
      }
    });

    socketRef.current.on("chessMove", ({ move, by }) => {
      if (by !== role) {
        try {
          const result = chessRef.current.move(move);
          if (result) {
            setFen(chessRef.current.fen());
            setTurn(chessRef.current.turn() === "w" ? "white" : "black");
            checkGameStatus();
          }
        } catch (error) {
          console.error("Error applying move:", error, move);
        }
      }
    });

    socketRef.current.on("invalidMove", (msg) => {
      toast.error(msg);
    });

    socketRef.current.on("playersUpdate", (data) => {
      setPlayers(data);
    });

    socketRef.current.on("gameStarted", (status) => {
      setGameStarted(status);
    });

    return () => {
      document.removeEventListener("visibilitychange", rejoin);
      socketRef.current.disconnect();
    };
  }, [roomId, navigate]);

  const checkGameStatus = () => {
    if (chessRef.current.isCheckmate()) {
      const winner = chessRef.current.turn() === "w" ? "black" : "white";
      toast.success(`Checkmate! ${winner.charAt(0).toUpperCase() + winner.slice(1)} wins.`);
    } else if (chessRef.current.isStalemate()) {
      toast("Stalemate!", { icon: "🤝" });
    } else if (chessRef.current.isCheck()) {
      toast("Check!", { icon: "⚠️" });
    }
  };

  const onDrop = (sourceSquare, targetSquare) => {
    if (!gameStarted) {
      toast.error("Opponent hasn't joined yet.");
      return false;
    }
    if (role === "viewer") {
      toast.error("You're a viewer. You can't move.");
      return false;
    }
    if (role !== turn) {
      toast.error("It's not your turn");
      return false;
    }

    const move = {
      from: sourceSquare,
      to: targetSquare,
      promotion: "q",
    };
    try {
      const result = chessRef.current.move(move);
      if (result) {
        const newFen = chessRef.current.fen();
        setFen(newFen);
        setTurn(chessRef.current.turn() === "w" ? "white" : "black");
        socketRef.current.emit("chessMove", { roomId, move, by: role, fen: newFen });
        checkGameStatus();
        return true;
      }
    } catch {
      toast.error("Invalid move");
    }
    return false;
  };

  const onSquareClick = (square) => {
    if (!gameStarted) {
      toast.error("Opponent hasn't joined yet.");
      return;
    }
    if (role === "viewer") {
      toast.error("You're a viewer. You can't move.");
      return;
    }
    if (role !== turn) {
      toast.error("It's not your turn");
      return;
    }
    if (!selectedSquare) {
      setSelectedSquare(square);
      onMouseOverSquare(square);
    } else {
      const move = {
        from: selectedSquare,
        to: square,
        promotion: "q",
      };
      try {
        const result = chessRef.current.move(move);
        if (result) {
          const newFen = chessRef.current.fen();
          setFen(newFen);
          setTurn(chessRef.current.turn() === "w" ? "white" : "black");
          socketRef.current.emit("chessMove", { roomId, move, by: role, fen: newFen });
          checkGameStatus();
        } else {
          toast.error("Invalid move");
        }
      } catch {
        toast.error("Invalid move");
      }
      setSelectedSquare(null);
      setHighlightSquares({});
    }
  };

  const onMouseOverSquare = (square) => {
    const moves = chessRef.current.moves({ square, verbose: true });
    if (moves.length === 0) {
      setHighlightSquares({});
      return;
    }
    const highlights = {};
    moves.forEach((m) => {
      highlights[m.to] = {
        background:
          "radial-gradient(circle,rgba(252, 0, 0, 1) 14%, rgba(238, 174, 202, 0) 11%, rgba(245, 0, 0, 0.19) 36%, rgba(250, 10, 10, 1) 58%, rgba(148, 187, 233, 0) 37%, rgba(255, 0, 0, 1) 42%, rgba(148, 187, 233, 0) 0%)",
      };
    });
    highlights[square] = {
      background: "#fa0202",
    };
    setHighlightSquares(highlights);
  };

  const onMouseOutSquare = () => {
    setHighlightSquares({});
  };

  return (
    <div className="room-container">
      <h2 className="room-title">Room: {roomId}</h2>
      <div className="room-content">
        <div className="chessboard-wrapper" ref={containerRef}>
          <div className="info-panel">
            <p>
              You are: <span className="bold-text">{role || "..."}</span>
            </p>
            <p>
              Turn: <span className="bold-text">{turn}</span>
            </p>
            <p>
              White: <span className="bold-text">{players.white || "Waiting..."}</span>
            </p>
            <p>
              Black: <span className="bold-text">{players.black || "Waiting..."}</span>
            </p>
          </div>
          <div className="chessboard-container">
            <Chessboard
              position={fen === "start" ? undefined : fen}
              boardWidth={boardWidth}
              onSquareClick={onSquareClick}
              onMouseOverSquare={onMouseOverSquare}
              onMouseOutSquare={onMouseOutSquare}
              onPieceDrop={onDrop}
              customSquareStyles={highlightSquares}
              boardOrientation={role === "white" ? "white" : "black"}
              transitionDuration={300}
              draggable={true}
            />
          </div>
        </div>
        <Chat socket={socketRef.current} roomId={roomId} username={username} />
      </div>
    </div>
  );
};

export default Room;
