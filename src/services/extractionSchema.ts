export const EXTRACTION_JSON_SCHEMA = {
  name: 'extracted_insights',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      memories: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            content: { type: 'string' },
            category: { type: 'string', enum: ['Plans', 'People', 'Notes', 'General'] },
            people: {
              type: 'array',
              items: {
                type: 'object',
                properties: { name: { type: 'string' }, relation: { type: ['string', 'null'] } },
                required: ['name', 'relation'],
                additionalProperties: false,
              },
            },
          },
          required: ['title', 'content', 'category', 'people'],
          additionalProperties: false,
        },
      },
      tasks: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            completed: { type: 'boolean' },
            dueAt: { type: ['string', 'null'] },
            time: { type: ['string', 'null'] },
          },
          required: ['title', 'completed', 'dueAt', 'time'],
          additionalProperties: false,
        },
      },
      reminders: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            scheduledAt: { type: ['string', 'null'] },
            status: { type: 'string', enum: ['pending', 'delivered', 'dismissed'] },
            deliveryPreference: { type: 'string', enum: ['audio', 'notification'] },
          },
          required: ['title', 'scheduledAt', 'status', 'deliveryPreference'],
          additionalProperties: false,
        },
      },
      events: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            startAt: { type: ['string', 'null'] },
            location: { type: ['string', 'null'] },
            people: { type: 'array', items: { type: 'string' } },
          },
          required: ['title', 'startAt', 'location', 'people'],
          additionalProperties: false,
        },
      },
    },
    required: ['memories', 'tasks', 'reminders', 'events'],
    additionalProperties: false,
  },
};
