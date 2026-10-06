/**
 * Adapt Site JSON content into the shared BookDocument contract.
 * @param {import('@myblog/book-build').JsonBookInput} data
 * @returns {import('@myblog/book-build').BookDocument}
 */
export function createJsonBookDocument(data) {
  return {
    id: data.id,
    title: data.title,
    description: data.description || '',
    tocTitle: data.tocTitle || '目录',
    entries: (data.entries || []).map((entry, index) => {
      if (
        entry.bodyType &&
        entry.bodyType !== 'markdown' &&
        entry.bodyType !== 'html'
      ) {
        throw new Error(`entries.${index}.bodyType must be markdown or html`);
      }
      const date = entry.date
        ? new Date(`${entry.date}T00:00:00Z`)
        : new Date('1970-01-01T00:00:00Z');
      if (!Number.isFinite(date.valueOf()))
        throw new Error(`Invalid book entry date: ${entry.date}`);
      return {
        id: entry.id || `entry-${index + 1}`,
        collection: 'json',
        title: entry.title,
        date,
        body: entry.body || '',
        bodyType: entry.bodyType === 'html' ? 'html' : 'markdown',
        metadata: entry.metadata || {},
      };
    }),
    metadata: data.metadata || {},
  };
}
