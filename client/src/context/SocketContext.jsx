import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

const configuredSocketUrl = import.meta.env.VITE_SOCKET_URL;
const SOCKET_URL = configuredSocketUrl || (import.meta.env.PROD
  ? 'https://kisanconnectserver.vercel.app'
  : 'http://localhost:5000');

export const SocketProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [joinedCentres, setJoinedCentres] = useState(new Set());

  useEffect(() => {
    if (!isAuthenticated) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      // Auto-join user room
      if (user?.role === 'farmer') {
        socket.emit('join:farmer', { userId: user._id });
      } else if (user?.role === 'officer') {
        socket.emit('join:officer', { centreId: null });
      }
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.warn('Socket connection error:', err.message);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, user?._id, user?.role]);

  const joinCentre = (centreId) => {
    if (socketRef.current && centreId && !joinedCentres.has(centreId)) {
      socketRef.current.emit('join:farmer', { userId: user?._id, centreId });
      setJoinedCentres((prev) => new Set([...prev, centreId]));
    }
  };

  const joinOfficerCentre = (centreId) => {
    if (socketRef.current && centreId) {
      socketRef.current.emit('join:officer', { centreId });
    }
  };

  const on = (event, callback) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback);
    }
  };

  const off = (event, callback) => {
    if (socketRef.current) {
      socketRef.current.off(event, callback);
    }
  };

  const joinRoom = (room) => {
    if (socketRef.current && room) {
      socketRef.current.emit('join:room', room);
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket: socketRef.current,
        isConnected,
        joinCentre,
        joinOfficerCentre,
        joinRoom,
        on,
        off,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be used within SocketProvider');
  return context;
};

export default SocketContext;
