import {useState} from 'react';
import clsx from 'clsx';

export function CopyCommand({
  cmd,
  className,
}: {
  cmd: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(cmd);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = cmd;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className={clsx('titan-terminal', className)}>
      <span className="titan-terminal__prompt">$</span>
      <code className="titan-terminal__cmd">{cmd}</code>
      <button
        type="button"
        onClick={onCopy}
        className="titan-terminal__btn"
        aria-label="Copy install command">
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}
