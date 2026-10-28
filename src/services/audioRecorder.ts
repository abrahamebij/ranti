/**
 * Audio Recording & Speech Segmentation Engine.
 * Manages audio capture sessions and delivers segmented speech clips
 * to the transcription pipeline (muse-voice-transcribe-1.0).
 */

export interface AudioSegment {
  uri: string;
  durationMs: number;
  timestamp: string;
}

type SegmentCallback = (segment: AudioSegment) => void;

class AudioRecorderService {
  private recording: boolean = false;
  private listeners: Set<SegmentCallback> = new Set();

  isRecording(): boolean {
    return this.recording;
  }

  onSegment(callback: SegmentCallback): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  async startListening(): Promise<boolean> {
    this.recording = true;
    return true;
  }

  async stopListening(): Promise<void> {
    this.recording = false;
  }

  emitSegment(segment: AudioSegment): void {
    if (!this.recording) return;
    for (const listener of this.listeners) {
      listener(segment);
    }
  }
}

export const audioRecorder = new AudioRecorderService();
