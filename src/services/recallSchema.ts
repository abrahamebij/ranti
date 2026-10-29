import { GroundingContext } from './recallContext';
import { ChatSourceItem } from '../types';

export const RECALL_JSON_SCHEMA = {
  name: 'conversational_recall',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      answer: { type: 'string' },
      sourceIds: {
        type: 'array',
        items: { type: 'string' },
      },
    },
    required: ['answer', 'sourceIds'],
    additionalProperties: false,
  },
};

export interface RecallResult {
  text: string;
  sources: ChatSourceItem[];
}

export function validateAndFormatRecall(
  rawParsed: { answer?: string; sourceIds?: string[] },
  context: GroundingContext
): RecallResult {
  const answer = String(rawParsed.answer || "I don't have a record of that in your memories or tasks.").trim();

  // Validate returned sourceIds against the context items that were actually provided
  const contextMap = new Map(context.items.map((item) => [item.id, item]));
  const validSources: ChatSourceItem[] = [];

  for (const rawId of rawParsed.sourceIds || []) {
    const matched = contextMap.get(rawId);
    if (matched && !validSources.some((s) => s.id === matched.id)) {
      validSources.push({
        id: matched.id,
        title: matched.title,
        type: matched.type,
      });
    }
  }

  return {
    text: answer,
    sources: validSources,
  };
}
