import "../model/book-types.mjs";

function parseDate(value) {
  if (!value) return new Date("1970-01-01T00:00:00Z");
  return new Date(`${value}T00:00:00Z`);
}

function toEntry(entry, index) {
  return {
    id: entry.id || `entry-${index + 1}`,
    collection: "json",
    title: entry.title,
    date: parseDate(entry.date),
    body: entry.body || "",
    bodyType: entry.bodyType || "markdown",
    metadata: entry.metadata || {},
  };
}

export function createJsonBookDocument(data) {
  return {
    id: data.id,
    title: data.title,
    description: data.description || "",
    tocTitle: data.tocTitle || "目录",
    entries: (data.entries || []).map(toEntry),
    metadata: data.metadata || {},
  };
}
