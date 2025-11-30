/**
 * React hook for connecting to Node-RED WebSocket and receiving real-time sensor data
 */

import { useEffect, useState, useRef, useCallback } from "react";
import {
  NodeRedSensorPayload,
  ProcessedSensorData,
  processSensorPayload,
} from "../sensor-utils";

export interface UseNodeRedSensorOptions {
  wsUrl?: string;
  autoConnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export interface UseNodeRedSensorReturn {
  data: ProcessedSensorData | null;
  isConnected: boolean;
  error: string | null;
  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;
}

const DEFAULT_WS_URL = "ws://localhost:1880/ws/sensors";
const DEFAULT_RECONNECT_INTERVAL = 5000; // 5 seconds
const DEFAULT_MAX_RECONNECT_ATTEMPTS = 10;

export function useNodeRedSensor(
  options: UseNodeRedSensorOptions = {}
): UseNodeRedSensorReturn {
  const {
    wsUrl = DEFAULT_WS_URL,
    autoConnect = true,
    reconnectInterval = DEFAULT_RECONNECT_INTERVAL,
    maxReconnectAttempts = DEFAULT_MAX_RECONNECT_ATTEMPTS,
  } = options;

  const [data, setData] = useState<ProcessedSensorData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const shouldConnectRef = useRef(autoConnect);

  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const disconnect = useCallback(() => {
    shouldConnectRef.current = false;
    clearReconnectTimeout();

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
  }, [clearReconnectTimeout]);

  const connect = useCallback(() => {
    // Prevent multiple connections
    if (
      wsRef.current?.readyState === WebSocket.OPEN ||
      wsRef.current?.readyState === WebSocket.CONNECTING
    ) {
      console.log("[WebSocket] Connection already active, skipping...");
      return;
    }

    shouldConnectRef.current = true;
    clearReconnectTimeout();

    console.log(`[WebSocket] Initiating connection to ${wsUrl}...`);

    try {
      const ws = new WebSocket(wsUrl);

      // Set ref immediately to prevent duplicate connections
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[WebSocket] ✅ Connected to Node-RED");
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          console.log("[WebSocket] 📩 Received data:", event.data);
          const payload: NodeRedSensorPayload = JSON.parse(event.data);
          const processedData = processSensorPayload(payload);
          setData(processedData);
        } catch (err) {
          console.error("[WebSocket] Failed to parse message:", err);
          setError("Failed to parse sensor data");
        }
      };

      ws.onerror = (event) => {
        console.error("[WebSocket] ❌ Error:", event);
        setError("WebSocket connection error");
      };

      ws.onclose = (event) => {
        console.log(
          `[WebSocket] 🔌 Disconnected (code: ${event.code}, reason: ${event.reason})`
        );
        setIsConnected(false);
        wsRef.current = null;

        // Attempt to reconnect if we should be connected
        if (
          shouldConnectRef.current &&
          reconnectAttemptsRef.current < maxReconnectAttempts
        ) {
          reconnectAttemptsRef.current += 1;
          console.log(
            `[WebSocket] Attempting to reconnect (${reconnectAttemptsRef.current}/${maxReconnectAttempts})...`
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          setError(
            `Failed to connect after ${maxReconnectAttempts} attempts. Please check if Node-RED is running.`
          );
        }
      };
    } catch (err) {
      console.error("[WebSocket] Failed to create connection:", err);
      setError(`Failed to create WebSocket connection: ${err}`);
      wsRef.current = null;
    }
  }, [wsUrl, reconnectInterval, maxReconnectAttempts, clearReconnectTimeout]);

  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    disconnect();
    setTimeout(() => connect(), 100);
  }, [connect, disconnect]);

  // Auto-connect on mount if enabled
  useEffect(() => {
    // Prevent duplicate connections on hot reload
    if (
      wsRef.current?.readyState === WebSocket.OPEN ||
      wsRef.current?.readyState === WebSocket.CONNECTING
    ) {
      return;
    }

    if (autoConnect) {
      connect();
    }

    // Cleanup on unmount
    return () => {
      shouldConnectRef.current = false;
      clearReconnectTimeout();
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []); // Empty deps to run only once

  return {
    data,
    isConnected,
    error,
    connect,
    disconnect,
    reconnect,
  };
}
