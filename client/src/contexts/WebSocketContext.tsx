import { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode } from "react";

// Enum for readability of connection states
export enum WebSocketReadyState {
  CONNECTING = 0,
  OPEN = 1,
  CLOSING = 2,
  CLOSED = 3,
}

// WebSocket message types
export type WebSocketMessage = {
  type: string;
  [key: string]: any;
};

// Context type definition
interface WebSocketContextType {
  readyState: WebSocketReadyState;
  lastMessage: WebSocketMessage | null;
  sendMessage: (message: WebSocketMessage) => void;
  connected: boolean;
}

// Default context value
const defaultContextValue: WebSocketContextType = {
  readyState: WebSocketReadyState.CLOSED,
  lastMessage: null,
  sendMessage: () => {},
  connected: false,
};

// Create the context
const WebSocketContext = createContext<WebSocketContextType>(defaultContextValue);

// Custom hook to use the WebSocket context
export const useWebSocket = () => useContext(WebSocketContext);

// WebSocket Provider props
interface WebSocketProviderProps {
  children: ReactNode;
}

// Provider component
export const WebSocketProvider = ({ children }: WebSocketProviderProps) => {
  const [readyState, setReadyState] = useState<WebSocketReadyState>(WebSocketReadyState.CLOSED);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [connected, setConnected] = useState(false);
  
  const socketRef = useRef<WebSocket | null>(null);

  // Initialize WebSocket connection
  useEffect(() => {
    const connectWebSocket = () => {
      // Create WebSocket connection with the correct protocol based on current URL
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      const newSocket = new WebSocket(wsUrl);
      socketRef.current = newSocket;
      
      newSocket.onopen = () => {
        console.log("WebSocket connection established");
        setReadyState(WebSocketReadyState.OPEN);
        setConnected(true);
      };
      
      newSocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log("WebSocket message received:", message);
          setLastMessage(message);
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };
      
      newSocket.onclose = () => {
        console.log("WebSocket connection closed");
        setReadyState(WebSocketReadyState.CLOSED);
        setConnected(false);
        
        // Try to reconnect after a delay
        setTimeout(() => {
          connectWebSocket();
        }, 3000);
      };
      
      newSocket.onerror = (error) => {
        console.error("WebSocket error:", error);
        // The socket will close automatically after an error
      };
    };
    
    connectWebSocket();
    
    // Clean up on unmount
    return () => {
      if (socketRef.current && socketRef.current.readyState === WebSocketReadyState.OPEN) {
        socketRef.current.close();
      }
    };
  }, []);
  
  // Function to send messages through the WebSocket
  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (socketRef.current && socketRef.current.readyState === WebSocketReadyState.OPEN) {
      socketRef.current.send(JSON.stringify(message));
    } else {
      console.warn("Cannot send message: WebSocket is not connected");
    }
  }, []);
  
  // Context value
  const value = {
    readyState,
    lastMessage,
    sendMessage,
    connected,
  };
  
  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};