// ─── Web Search — Real-time Search at Chat Time ──────────────
// Search DuckDuckGo saat knowledge base tidak punya jawaban
// Transparent ke user — terasa seperti model yang pintar

const SEARCH_PROXY = '/api/search';

// ─── Search DuckDuckGo ────────────────────────────────────────
export async function searchWeb(query, maxResults = 3) {
  try {
    const res = await fetch(`${SEARCH_PROXY}?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`, {
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      console.warn('[WebSearch] DuckDuckGo API failed:', res.status);
      return await searchWebFallback(query, maxResults);
    }

    const data = await res.json();
    const results = [];

    // Abstract (instant answer)
    if (data.Abstract && data.Abstract.length > 30) {
      results.push({
        title: data.Heading || query,
        content: data.Abstract,
        source: data.AbstractSource || 'DuckDuckGo',
        url: data.AbstractURL || '',
      });
    }

    // Related topics
    if (data.RelatedTopics) {
      for (const topic of data.RelatedTopics) {
        if (results.length >= maxResults) break;
        if (topic.Text && topic.Text.length > 30) {
          results.push({
            title: topic.FirstURL?.split('/').pop()?.replace(/_/g, ' ') || '',
            content: topic.Text,
            source: 'DuckDuckGo',
            url: topic.FirstURL || '',
          });
        }
        // Sub-topics
        if (topic.Topics) {
          for (const sub of topic.Topics) {
            if (results.length >= maxResults) break;
            if (sub.Text && sub.Text.length > 30) {
              results.push({
                title: sub.FirstURL?.split('/').pop()?.replace(/_/g, ' ') || '',
                content: sub.Text,
                source: 'DuckDuckGo',
                url: sub.FirstURL || '',
              });
            }
          }
        }
      }
    }

    // Infobox
    if (data.Infobox?.content && results.length < maxResults) {
      const infoText = data.Infobox.content
        .filter(i => i.label && i.value)
        .map(i => `${i.label}: ${i.value}`)
        .join('\n');
      if (infoText.length > 20) {
        results.push({
          title: `${data.Heading || query} — Info`,
          content: infoText,
          source: 'DuckDuckGo Infobox',
          url: data.AbstractURL || '',
        });
      }
    }

    console.log(`[WebSearch] DuckDuckGo: ${results.length} results for "${query}"`);
    return results;
  } catch (e) {
    console.warn('[WebSearch] DuckDuckGo error:', e.message);
    return await searchWebFallback(query, maxResults);
  }
}

// ─── Fallback: Search via DuckDuckGo HTML lite ────────────────
async function searchWebFallback(query, maxResults = 3) {
  try {
    const res = await fetch(`${SEARCH_PROXY}/html/?q=${encodeURIComponent(query)}`, {
      signal: AbortSignal.timeout(8000),
      headers: {
        'Accept': 'text/html',
      },
    });

    if (!res.ok) return [];
    const html = await res.text();

    // Parse simple results dari HTML
    const results = [];
    const snippetRegex = /<a[^>]*class="result__snippet"[^>]*>(.*?)<\/a>/gi;
    const titleRegex = /<a[^>]*class="result__a"[^>]*>(.*?)<\/a>/gi;

    const snippets = [...html.matchAll(snippetRegex)].map(m => m[1].replace(/<[^>]*>/g, '').trim());
    const titles = [...html.matchAll(titleRegex)].map(m => m[1].replace(/<[^>]*>/g, '').trim());

    for (let i = 0; i < Math.min(titles.length, snippets.length, maxResults); i++) {
      if (snippets[i] && snippets[i].length > 20) {
        results.push({
          title: titles[i] || '',
          content: snippets[i],
          source: 'Web Search',
          url: '',
        });
      }
    }

    console.log(`[WebSearch] HTML fallback: ${results.length} results`);
    return results;
  } catch (e) {
    console.warn('[WebSearch] Fallback error:', e.message);
    return [];
  }
}

// ─── Format search results untuk context injection ───────────
export function formatSearchResults(results) {
  if (!results || results.length === 0) return null;
  return results.map(r =>
    `[${r.source}]\n${r.title}\n${r.content}`
  ).join('\n\n');
}

export default { searchWeb, formatSearchResults };
