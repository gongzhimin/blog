import "../model/book-types.mjs";

export function defaultFormatDate(date) {
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function buildToc({ articles, tocTitle = "目录", romanPage = "v" }) {
  return (
    `<div class="table-contents"><h1>${tocTitle}</h1><ul>` +
    articles
      .map(
        (article, index) =>
          `<li><a href="#page/${7 + index}">${article.title} <span>${1 + index}</span></a></li>`,
      )
      .join("") +
    `</ul></div><span class="page-number">${romanPage}</span>`
  );
}

export function buildBookRuntime({
  document,
  bookConfig,
  renderMarkdown,
  stripLeadingTitle,
  formatDate = defaultFormatDate,
  romanTocPage = () => "v",
}) {
  const articles = document.entries.map((entry) => {
    const body = stripLeadingTitle(entry.body || "", entry.title);
    return {
      title: entry.title,
      dateStr: formatDate(entry.date),
      bodyHTML: entry.bodyType === "html" ? body : renderMarkdown(body),
      source: {
        id: entry.id,
        collection: entry.collection,
      },
    };
  });

  const toc = buildToc({
    articles,
    tocTitle: document.tocTitle,
    romanPage: romanTocPage(5),
  });

  const estPages = 7 + articles.length * 3 + 2;
  const config = JSON.parse(JSON.stringify(bookConfig));
  config.book.turn.startPage = 7;
  config.book.turn.totalPages = estPages;
  config.book.turn.backPage = config.book.turn.totalPages - 1;
  const pagination = config.book.pagination || {};
  const mobilePagination = config.book.pagination?.mobilePagination || null;
  config.runtime = {
    ...(config.runtime || {}),
    pagination: {
      articleWidth: pagination.contentWidth,
      articleHeight: pagination.contentHeight,
      tocWidth: pagination.tocWidth ?? pagination.contentWidth,
      tocHeight: pagination.tocHeight ?? 400,
    },
    mobilePagination: mobilePagination ? {
      articleWidth: mobilePagination.contentWidth,
      articleHeight: mobilePagination.contentHeight,
      tocWidth: mobilePagination.tocWidth ?? mobilePagination.contentWidth,
      tocHeight: mobilePagination.tocHeight ?? 320,
    } : null,
  };
  config.articles = articles;
  config.toc = toc;
  config.source = {
    documentId: document.id,
    documentTitle: document.title,
    entryCount: document.entries.length,
  };

  return {
    document,
    articles,
    toc,
    config,
  };
}
