// Minimaler, sicherer Markdown→HTML-Renderer.
// Die Eingabe wird ZUERST HTML-escaped → es kann kein rohes HTML/JS eingeschleust
// werden (XSS-sicher), danach werden Markdown-Konstrukte in Tags umgewandelt.

function esc(s: string): string {
  // Auch " und ' escapen: Inhalte landen u. a. in Attributwerten (href="…").
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function inline(s: string): string {
  // Inline-Code zuerst
  s = s.replace(/`([^`]+)`/g, (_m, c) => `<code>${c}</code>`);
  // Fett, dann kursiv
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
  // Links [Text](url) – nur http(s) oder relative Pfade zulassen
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, t, u) => {
    const safe = /^(https?:\/\/|\/)/i.test(u) ? u : '#';
    const ext = /^https?:/i.test(safe) ? ' target="_blank" rel="noopener noreferrer"' : '';
    return `<a href="${safe}"${ext}>${t}</a>`;
  });
  return s;
}

// Inline-Listenstile: die Tailwind-Base setzt `list-style:none`, und das Typography-
// Plugin ist nicht garantiert vorhanden. Damit Aufzählungen IMMER (auch in der
// Discord-ähnlichen Announce-Vorschau) sichtbare Punkte haben, stylen wir inline.
const UL_OPEN = '<ul style="list-style:disc;padding-left:1.5rem;margin:0.25rem 0">';
const OL_OPEN = '<ol style="list-style:decimal;padding-left:1.5rem;margin:0.25rem 0">';

export interface MarkdownOptions {
  /** Discord-Stil: einzelne Zeilenumbrüche bleiben als <br> erhalten. */
  softBreaks?: boolean;
}

export function renderMarkdown(md: string, opts: MarkdownOptions = {}): string {
  const lines = esc(md ?? '').replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  let inUl = false,
    inOl = false,
    inCode = false;
  let para: string[] = [];
  const flushPara = () => {
    if (para.length) {
      const joined = para.join(opts.softBreaks ? '<br>' : ' ');
      out.push(`<p>${inline(joined)}</p>`);
      para = [];
    }
  };
  const closeLists = () => {
    if (inUl) {
      out.push('</ul>');
      inUl = false;
    }
    if (inOl) {
      out.push('</ol>');
      inOl = false;
    }
  };

  for (const line of lines) {
    if (/^```/.test(line.trim())) {
      flushPara();
      closeLists();
      if (!inCode) {
        out.push('<pre><code>');
        inCode = true;
      } else {
        out.push('</code></pre>');
        inCode = false;
      }
      continue;
    }
    if (inCode) {
      out.push(line);
      continue;
    }
    if (line.trim() === '') {
      flushPara();
      closeLists();
      continue;
    }
    let m: RegExpMatchArray | null;
    if ((m = line.match(/^(#{1,4})\s+(.*)$/))) {
      flushPara();
      closeLists();
      const lvl = Math.min(m[1].length + 1, 6); // # -> h2 (h1 = Seitentitel)
      out.push(`<h${lvl}>${inline(m[2])}</h${lvl}>`);
      continue;
    }
    if ((m = line.match(/^\s*[-*]\s+(.*)$/))) {
      flushPara();
      if (inOl) {
        out.push('</ol>');
        inOl = false;
      }
      if (!inUl) {
        out.push(UL_OPEN);
        inUl = true;
      }
      out.push(`<li>${inline(m[1])}</li>`);
      continue;
    }
    if ((m = line.match(/^\s*\d+\.\s+(.*)$/))) {
      flushPara();
      if (inUl) {
        out.push('</ul>');
        inUl = false;
      }
      if (!inOl) {
        out.push(OL_OPEN);
        inOl = true;
      }
      out.push(`<li>${inline(m[1])}</li>`);
      continue;
    }
    para.push(line.trim());
  }
  flushPara();
  closeLists();
  if (inCode) out.push('</code></pre>');
  return out.join('\n');
}
