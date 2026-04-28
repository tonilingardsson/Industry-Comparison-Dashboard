import { useMemo, useState } from 'react';
import { Check, Copy, Linkedin } from 'lucide-react';

interface LinkedInShareProps {
  chartId: string;
  suggestedPost: string;
}

function getShareUrl(chartId: string) {
  if (typeof window === 'undefined') {
    return '';
  }

  const url = new URL(window.location.href);
  url.hash = chartId;
  return url.toString();
}

export function LinkedInShare({ chartId, suggestedPost }: LinkedInShareProps) {
  const [copied, setCopied] = useState(false);

  const fallbackShareUrl = useMemo(() => `#${chartId}`, [chartId]);

  const handleShare = () => {
    const shareUrl = getShareUrl(chartId);
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
    window.open(linkedInUrl, '_blank', 'noopener,noreferrer');
  };

  const handleCopy = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(suggestedPost);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = suggestedPost;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="mt-6 rounded-lg border border-[#d9e2e8] bg-[#f8fafb] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold text-[#14212b]">Share this graph</p>
          <p className="text-sm text-[#526371]">Use the button for the app URL, then copy the suggested post text below.</p>
        </div>
        <button
          type="button"
          onClick={handleShare}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0a66c2] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#084f96]"
        >
          <Linkedin className="h-4 w-4" />
          Share on LinkedIn
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-stretch">
        <textarea
          readOnly
          value={suggestedPost}
          className="min-h-20 resize-none rounded-lg border border-[#d9e2e8] bg-white p-3 text-sm leading-6 text-[#14212b] outline-none"
          aria-label="Suggested LinkedIn post text"
        />
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#14212b]/15 bg-white px-4 py-2 text-sm font-bold text-[#14212b] transition hover:border-[#14212b]/30 hover:bg-[#eef9fd]"
        >
          {copied ? <Check className="h-4 w-4 text-[#168fca]" /> : <Copy className="h-4 w-4" />}
          {copied ? 'Copied' : 'Copy text'}
        </button>
      </div>

      <span className="sr-only">Share URL anchor: {fallbackShareUrl}</span>
    </div>
  );
}
