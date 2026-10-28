/**
 * Audio segment descriptor emitted after each rolling recording window.
 */
export interface AudioSegment {
  uri: string;
  durationMs: number;
  timestamp: string;
}

/** Rolling window duration in milliseconds. */
export const SEGMENT_DURATION_MS = 30_000;

/**
 * Minimum file size to consider a segment non-silent.
 * Segments below this threshold are discarded without transcription.
 */
export const MIN_SEGMENT_BYTES = 2_048;
