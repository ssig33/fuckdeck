import { ConnectionStatus, StreamEvent, MastodonStatus } from "../types";
import { MastodonNotification } from "../types/notification";
import { getInstanceInfo } from "./mastodon";

type EventCallback = (event: StreamEvent) => void;
type StatusChangeCallback = (status: ConnectionStatus) => void;

export class MastodonStreamClient {
  private ws: WebSocket | null = null;
  private instance: string;
  private token: string;
  private status: ConnectionStatus = 'disconnected';
  private eventCallbacks: EventCallback[] = [];
  private statusCallbacks: StatusChangeCallback[] = [];
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;
  private reconnectTimeout: number | null = null;
  private isInitialConnect = true;

  constructor(instance: string, token: string) {
    this.instance = instance;
    this.token = token;
  }

  async connect(): Promise<void> {
    try {
      this.setStatus('connecting');

      const { streamingUrl } = await getInstanceInfo(this.instance);
      const baseUrl = streamingUrl || `wss://${this.instance}/api/v1/streaming`;
      const url = `${baseUrl}?stream=user&access_token=${this.token}`;

      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log(`[Streaming] Connected to ${this.instance}`);
        this.setStatus('streaming');
        this.reconnectAttempts = 0;
        this.isInitialConnect = false;
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.event && data.payload) {
            const streamEvent: StreamEvent = {
              event: data.event,
              payload: data.payload,
            };
            this.notifyEventListeners(streamEvent);
          }
        } catch (error) {
          console.error('[Streaming] Failed to parse message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error(`[Streaming] WebSocket error for ${this.instance}:`, error);

        if (this.isInitialConnect) {
          this.setStatus('error');
          this.disconnect();
        }
      };

      this.ws.onclose = () => {
        console.log(`[Streaming] Connection closed for ${this.instance}`);
        this.ws = null;

        if (this.isInitialConnect) {
          console.log(`[Streaming] Initial connection failed for ${this.instance}, falling back to polling`);
          this.isInitialConnect = false;
          this.setStatus('polling');
        } else if (this.status !== 'error' && this.status !== 'polling') {
          this.setStatus('connecting');
          this.scheduleReconnect();
        }
      };

    } catch (error) {
      console.error(`[Streaming] Failed to connect to ${this.instance}:`, error);
      this.setStatus('polling');
      throw error;
    }
  }

  disconnect(): void {
    if (this.reconnectTimeout !== null) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.reconnectAttempts = 0;
  }

  on(event: 'event', callback: EventCallback): void;
  on(event: 'statusChange', callback: StatusChangeCallback): void;
  on(event: string, callback: EventCallback | StatusChangeCallback): void {
    if (event === 'event') {
      this.eventCallbacks.push(callback as EventCallback);
    } else if (event === 'statusChange') {
      this.statusCallbacks.push(callback as StatusChangeCallback);
    }
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  private setStatus(status: ConnectionStatus): void {
    if (this.status !== status) {
      this.status = status;
      this.statusCallbacks.forEach(callback => callback(status));
    }
  }

  private notifyEventListeners(event: StreamEvent): void {
    this.eventCallbacks.forEach(callback => callback(event));
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log(`[Streaming] Max reconnect attempts reached for ${this.instance}, giving up`);
      this.setStatus('error');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 16000);
    this.reconnectAttempts++;

    console.log(`[Streaming] Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms for ${this.instance}`);

    this.reconnectTimeout = window.setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect().catch((error) => {
        console.error(`[Streaming] Reconnect failed for ${this.instance}:`, error);
      });
    }, delay);
  }
}

export function parseStreamPayload(event: StreamEvent): MastodonStatus | MastodonNotification | string | null {
  try {
    if (event.event === 'delete') {
      return event.payload;
    }

    return JSON.parse(event.payload);
  } catch (error) {
    console.error('[Streaming] Failed to parse payload:', error);
    return null;
  }
}
