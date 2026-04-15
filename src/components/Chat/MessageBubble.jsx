import { useMemo, useCallback, useState } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import "./MessageBubble.css";

// Configure marked
marked.setOptions({
  breaks: true,
  gfm: true,
});

function renderMarkdown(text) {
  if (!text) return '';
  const rawHtml = marked.parse(text);
  return DOMPurify.sanitize(rawHtml, {
    ADD_TAGS: ['pre', 'code'],
    ADD_ATTR: ['class'],
  });
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [text]);

  return (
    <button className="copy-btn" onClick={handleCopy} title={copied ? "Tersalin!" : "Salin kode"}>
      {copied ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
      <span>{copied ? 'Tersalin!' : 'Salin'}</span>
    </button>
  );
}

function CodeBlock({ code, language }) {
  return (
    <div className="code-block-wrapper">
      <div className="code-block-header">
        <span className="code-lang">{language || 'code'}</span>
        <CopyButton text={code} />
      </div>
      <pre><code className={language ? `language-${language}` : ''}>{code}</code></pre>
    </div>
  );
}

function MessageContent({ content, isStreaming }) {
  const processedHtml = useMemo(() => renderMarkdown(content), [content]);

  // Extract code blocks and render them with copy buttons
  const parts = useMemo(() => {
    if (!content) return [];
    
    const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
    const segments = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      // Text before code block
      if (match.index > lastIndex) {
        const textBefore = content.slice(lastIndex, match.index);
        segments.push({ type: 'text', content: textBefore });
      }
      // Code block
      segments.push({
        type: 'code',
        language: match[1],
        content: match[2].trimEnd(),
      });
      lastIndex = match.index + match[0].length;
    }

    // Remaining text after last code block
    if (lastIndex < content.length) {
      segments.push({ type: 'text', content: content.slice(lastIndex) });
    }

    return segments;
  }, [content]);

  // If there are code blocks, render with CodeBlock components
  if (parts.some(p => p.type === 'code')) {
    return (
      <div className="message-text">
        {parts.map((part, i) => {
          if (part.type === 'code') {
            return <CodeBlock key={i} code={part.content} language={part.language} />;
          }
          const html = renderMarkdown(part.content);
          return (
            <div
              key={i}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        })}
      </div>
    );
  }

  // No code blocks — render normally
  return (
    <div
      className="message-text"
      dangerouslySetInnerHTML={{ __html: processedHtml }}
    />
  );
}

export default function MessageBubble({ message, isStreaming = false }) {
  const isUser = message.role === "user";
  const content = message.content || "";

  return (
    <div className={`message ${isUser ? "user" : "assistant"} ${isStreaming ? "streaming" : ""} ${message.aborted ? "aborted" : ""}`}>
      <div className="message-avatar">
        {isUser ? (
          <div className="avatar user-avatar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
        ) : (
          <div className="avatar nara-avatar">
            <svg width="18" height="18" viewBox="0 0 64 64" fill="none">
              <circle cx="32" cy="32" r="28" fill="var(--color-primary)" />
              <path d="M20 32c0-6.6 5.4-12 12-12s12 5.4 12 12" stroke="#fff" strokeWidth="3" strokeLinecap="round" fill="none" />
              <circle cx="32" cy="42" r="4" fill="#fff" />
            </svg>
          </div>
        )}
      </div>
      <div className="message-content">
        <MessageContent content={content} isStreaming={isStreaming} />
        {isStreaming && (
          <span className="typing-indicator">
            <span></span>
            <span></span>
            <span></span>
          </span>
        )}
        {message.aborted && (
          <div className="aborted-badge">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            <span>Dihentikan</span>
          </div>
        )}
      </div>
    </div>
  );
}
