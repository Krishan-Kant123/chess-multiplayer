import { Chessboard } from "react-chessboard";
import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import io from "socket.io-client";
import Chat from "./Chat";
import { Chess } from "chess.js";
import "./Room.css"
import toast from 'react-hot-toast';

const SOCKET_SERVER_URL = "http://localhost:4000";

const Room = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const username = localStorage.getItem("username") || "";
  const [role, setRole] = useState(null);
  const [turn, setTurn] = useState("white");
  const [fen, setFen] = useState("start");
  const [highlightSquares, setHighlightSquares] = useState({});
  const [boardWidth, setBoardWidth] = useState(400);
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
    window.addEventListener('resize', calculateBoardWidth);
    
    return () => {
      window.removeEventListener('resize', calculateBoardWidth);
    };
  }, []);

  useEffect(() => {
    if (!username) {
      navigate("/");
      return;
    }

    socketRef.current = io(SOCKET_SERVER_URL);
    socketRef.current.emit("joinRoom", { roomId, username });

    socketRef.current.on("roleAssigned", (assignedRole) => {
      setRole(assignedRole);
    });

    socketRef.current.on("turnUpdate", (newTurn) => {
      setTurn(newTurn);
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

    return () => {
      socketRef.current.disconnect();
    };
  }, [roomId, navigate]);

  const checkGameStatus = () => {
    if (chessRef.current.isCheckmate()) {
      toast.success(`Checkmate! ${turn === "white" ? "Black" : "White"} wins.`);
    } else if (chessRef.current.isStalemate()) {
      toast("Stalemate!", { icon: "🤝" });
    } else if (chessRef.current.isCheck()) {
      toast("Check!", { icon: "⚠️" });
    }
  };

  const onPieceDrop = (sourceSquare, targetSquare) => {
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
        setFen(chessRef.current.fen());
        setTurn(chessRef.current.turn() === "w" ? "white" : "black");
        socketRef.current.emit("chessMove", { roomId, move, by: role });
        checkGameStatus();
        return true;
      } else {
        toast.error("Invalid move");
        return false;
      }
    } catch (error) {
      console.error("Move error:", error);
      toast.error("Invalid move");
      return false;
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
          chessRef.current.get(m.to) !== null
            ? "rgba(255, 0, 0, 0.4)"
            : "rgba(0, 255, 0, 0.3)",
      };
    });
    highlights[square] = { background: "rgba(0, 0, 255, 0.3)" };

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
          </div>
          <div className="chessboard-container">
            <Chessboard
              position={fen === "start" ? undefined : fen}
              boardWidth={boardWidth}
              onPieceDrop={onPieceDrop}
              onMouseOverSquare={onMouseOverSquare}
              onMouseOutSquare={onMouseOutSquare}
              customSquareStyles={highlightSquares}
              boardOrientation={role === "white" ? "white" : "black"}
              transitionDuration={300}
              draggable={role === turn}
            />
          </div>
        </div>
        <Chat socket={socketRef.current} roomId={roomId} username={username} />
      </div>
    </div>
  );
};

export default Room;


