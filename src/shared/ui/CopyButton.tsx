import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface CopyButtonProps {
  text: string;
}

export function CopyButton({ text }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for non-HTTPS or restricted contexts
        const el = document.createElement('textarea');
        el.value = text;
        el.style.position = 'fixed';
        el.style.opacity = '0';
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  return (
    <button
      onClick={handleCopy}
      title="Copy to clipboard"
      className="p-1 text-[--color-text-muted] hover:text-[--color-primary] transition-colors"
    >
      {copied ? <Check size={13} className="text-[--color-status-ready]" /> : <Copy size={13} />}
    </button>
  );
}
