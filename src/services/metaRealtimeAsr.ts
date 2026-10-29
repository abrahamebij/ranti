/**
 * Meta Realtime ASR WebSocket Client.
 *
 * Implements the official Meta Voice Realtime API:
 * Endpoint: wss://api.meta.ai/v1/asr/realtime?sessionId=<sessionId>
 *
 * Lifecycle:
 *   1. Connect via native WebSocket.
 *   2. Send JSON handshake frame with Bearer token & audioEncoding within 10s.
 *   3. Wait for acknowledgement frame containing "sessionId".
 *   4. Stream raw PCM binary frames (Uint8Array / ArrayBuffer).
 *   5. Send {"type": "endStream"} text frame to half-close input.
 *   6. Receive transcript events until server closes with code 1000.
 */

const API_KEY = process.env.EXPO_PUBLIC_META_API_KEY ?? '';

export interface RealtimeTranscriptEvent {
  type: 'transcript';
  transcript: string;
  final: boolean;
  startMs?: number;
  endMs?: number;
  speaker?: string;
}

export interface RealtimeSessionOptions {
  sessionId?: string;
  mode?: 'PUSH_TO_TALK' | 'ENDPOINTING' | 'DIARIZATION';
  audioEncoding?: 'PCM_16KHZ' | 'PCM_24KHZ';
  onTranscript?: (event: RealtimeTranscriptEvent) => void;
  onError?: (error: Error) => void;
  onClose?: (code: number, reason: string) => void;
}

export class MetaRealtimeAsrSession {
  private ws: WebSocket | null = null;
  private sessionId: string;
  private mode: string;
  private audioEncoding: string;
  private isHandshakeComplete = false;
  private onTranscript?: (event: RealtimeTranscriptEvent) => void;
  private onError?: (error: Error) => void;
  private onClose?: (code: number, reason: string) => void;

  constructor(options: RealtimeSessionOptions = {}) {
    this.sessionId = options.sessionId ?? `stream-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.mode = options.mode ?? 'PUSH_TO_TALK';
    this.audioEncoding = options.audioEncoding ?? 'PCM_16KHZ';
    this.onTranscript = options.onTranscript;
    this.onError = options.onError;
    this.onClose = options.onClose;
  }

  async connect(): Promise<string> {
    if (!API_KEY) {
      throw new Error('META_API_KEY is not set. Add EXPO_PUBLIC_META_API_KEY to your .env file.');
    }

    const url = `wss://api.meta.ai/v1/asr/realtime?sessionId=${encodeURIComponent(this.sessionId)}`;

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(url);
        this.ws.binaryType = 'arraybuffer';

        let ackReceived = false;

        this.ws.onopen = () => {
          // 1. Send Handshake as the first JSON text frame immediately
          const handshake = {
            authorization: { accessToken: `Bearer ${API_KEY}` },
            audioEncoding: this.audioEncoding,
            model: 'muse-voice-transcribe-1.0',
            mode: this.mode,
          };
          this.ws?.send(JSON.stringify(handshake));
        };

        this.ws.onmessage = (event) => {
          if (typeof event.data !== 'string') {
            return;
          }

          try {
            const data = JSON.parse(event.data);

            // Handshake Acknowledgement (the only server frame with no type field)
            if (!ackReceived && data.sessionId) {
              ackReceived = true;
              this.isHandshakeComplete = true;
              resolve(data.sessionId);
              return;
            }

            if (data.type === 'error') {
              const err = new Error(data.message ?? 'Unknown Realtime ASR error');
              this.onError?.(err);
              return;
            }

            if (data.type === 'transcript') {
              this.onTranscript?.(data as RealtimeTranscriptEvent);
            }
          } catch (e) {
            console.warn('[MetaRealtimeAsrSession] Failed to parse message:', event.data, e);
          }
        };

        this.ws.onerror = (e) => {
          const err = new Error(`WebSocket error: ${JSON.stringify(e)}`);
          if (!ackReceived) {
            reject(err);
          } else {
            this.onError?.(err);
          }
        };

        this.ws.onclose = (event) => {
          this.isHandshakeComplete = false;
          this.onClose?.(event.code, event.reason);
          if (!ackReceived) {
            reject(new Error(`WebSocket closed before handshake ack: code ${event.code} (${event.reason})`));
          }
        };
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    });
  }

  /**
   * Stream a raw PCM binary chunk to the server.
   */
  sendPcmChunk(pcmData: ArrayBuffer | Uint8Array): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not open.');
    }
    if (!this.isHandshakeComplete) {
      throw new Error('Handshake not yet acknowledged by server.');
    }
    this.ws.send(pcmData);
  }

  /**
   * Half-close input. The server will process all pending audio and close with code 1000.
   */
  endStream(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'endStream' }));
    }
  }

  /**
   * Immediate hard close of the socket.
   */
  close(): void {
    if (this.ws) {
      this.ws.close(1000, 'Client closed');
      this.ws = null;
    }
  }
}
