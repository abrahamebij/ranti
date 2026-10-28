import { ExtractedInsights, Memory } from '../types';

const META_API_KEY = process.env.EXPO_PUBLIC_META_API_KEY || '';
const META_API_ENDPOINT =
  process.env.EXPO_PUBLIC_META_API_ENDPOINT || 'https://api.meta.com/v1';

export const metaApiService = {
  /**
   * Transcribe speech using muse-voice-transcribe-1.0
   */
  async transcribeAudio(audioUri: string): Promise<string> {
    if (!META_API_KEY) {
      console.warn('Meta API key is missing. Unable to transcribe.');
      return '';
    }

    try {
      const formData = new FormData();
      formData.append('model', 'muse-voice-transcribe-1.0');
      formData.append('file', {
        uri: audioUri,
        type: 'audio/m4a',
        name: 'recording.m4a',
      } as unknown as Blob);

      const res = await fetch(`${META_API_ENDPOINT}/audio/transcriptions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${META_API_KEY}`,
        },
        body: formData,
      });

      if (!res.ok) throw new Error(`Transcription failed: ${res.statusText}`);
      const data = await res.json();
      return data.text || '';
    } catch (e) {
      console.error('Transcription error:', e);
      return '';
    }
  },

  /**
   * Extract structured memories, events, tasks from transcript using muse-spark-1.3
   */
  async extractInsights(transcript: string): Promise<ExtractedInsights> {
    if (!transcript || transcript.trim().length === 0 || !META_API_KEY) {
      return { memories: [], tasks: [], reminders: [], events: [] };
    }

    const systemPrompt = `You are Muse Spark 1.3, an AI assistant specializing in memory extraction for people with memory difficulties.
Analyze the transcript and extract useful structured information:
- memories: important facts and commitments
- tasks: concrete actions to complete
- reminders: time-sensitive alerts
- events: calendar appointments
Return strictly valid JSON matching { memories: [], tasks: [], reminders: [], events: [] }.`;

    try {
      const res = await fetch(`${META_API_ENDPOINT}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${META_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'muse-spark-1.3',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: transcript },
          ],
          response_format: { type: 'json_object' },
        }),
      });

      if (!res.ok) throw new Error(`Extraction failed: ${res.statusText}`);
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      return JSON.parse(content || '{"memories":[],"tasks":[],"reminders":[],"events":[]}');
    } catch (e) {
      console.error('Extraction error:', e);
      return { memories: [], tasks: [], reminders: [], events: [] };
    }
  },

  /**
   * Conversational recall grounded strictly in stored database memories using muse-spark-1.3
   */
  async answerQuestion(
    question: string,
    memories: Memory[]
  ): Promise<{ text: string; sourceMemory?: Memory }> {
    if (memories.length === 0) {
      return {
        text: "I couldn't find any memories in your database.",
      };
    }

    const memoryContext = memories
      .map((m) => `[${m.title}] (${m.category}): ${m.content}`)
      .join('\n');

    const matched = memories.find((m) =>
      question.toLowerCase().includes(m.title.toLowerCase()) ||
      m.content.toLowerCase().includes(question.toLowerCase())
    );

    if (!META_API_KEY) {
      return {
        text: matched
          ? matched.content
          : "I couldn't find any information about that in your memories.",
        sourceMemory: matched,
      };
    }

    try {
      const res = await fetch(`${META_API_ENDPOINT}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${META_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'muse-spark-1.3',
          messages: [
            {
              role: 'system',
              content: `You are Ranti, a calm and concise memory assistant.
Answer the user's question using ONLY the following memories:
${memoryContext}
If the information is not in the memories, say "I couldn't find that in your memories." Do not hallucinate.`,
            },
            { role: 'user', content: question },
          ],
        }),
      });

      if (!res.ok) throw new Error(`Chat recall failed: ${res.statusText}`);
      const data = await res.json();
      return {
        text: data.choices?.[0]?.message?.content || "I couldn't find that in your memories.",
        sourceMemory: matched,
      };
    } catch (e) {
      console.error('Answer question error:', e);
      return {
        text: matched ? matched.content : "I couldn't retrieve that information right now.",
        sourceMemory: matched,
      };
    }
  },
};
