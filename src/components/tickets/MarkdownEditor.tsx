'use client';

import { useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';

export default function MarkdownEditor({
  value,
  onChange,
  placeholder = 'Écrivez en markdown...',
  rows = 6,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  const [preview, setPreview] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  function wrap(before: string, after: string) {
    const ta = ref.current;
    if (!ta) return;
    const s = ta.selectionStart;
    const e = ta.selectionEnd;
    const sel = value.slice(s, e);
    onChange(value.slice(0, s) + before + sel + after + value.slice(e));
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(s + before.length, s + before.length + sel.length);
    }, 0);
  }

  function insertAtLineStart(prefix: string) {
    const ta = ref.current;
    if (!ta) return;
    const s = ta.selectionStart;
    const lineStart = value.lastIndexOf('\n', s - 1) + 1;
    onChange(value.slice(0, lineStart) + prefix + value.slice(lineStart));
    setTimeout(() => ta.focus(), 0);
  }

  function appendBlock(block: string) {
    onChange(value.trimEnd() + '\n\n' + block + '\n');
  }

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-transparent">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1 bg-gray-50 border-b border-gray-200">
        <button
          type="button"
          onClick={() => wrap('**', '**')}
          title="Gras"
          className="px-2 py-0.5 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => wrap('*', '*')}
          title="Italique"
          className="px-2 py-0.5 text-sm italic text-gray-600 hover:bg-gray-200 rounded"
        >
          I
        </button>
        <button
          type="button"
          onClick={() => insertAtLineStart('- ')}
          title="Liste à puces"
          className="px-2 py-0.5 text-xs font-mono text-gray-600 hover:bg-gray-200 rounded"
        >
          ≡
        </button>
        <button
          type="button"
          onClick={() => appendBlock('---')}
          title="Séparateur horizontal"
          className="px-2 py-0.5 text-xs text-gray-500 hover:bg-gray-200 rounded"
        >
          ─
        </button>

        <div className="ml-auto flex rounded border border-gray-200 overflow-hidden text-xs">
          <button
            type="button"
            onClick={() => setPreview(false)}
            className={`px-2.5 py-0.5 ${
              !preview ? 'bg-white text-gray-900 font-medium' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            Écrire
          </button>
          <button
            type="button"
            onClick={() => setPreview(true)}
            className={`px-2.5 py-0.5 ${
              preview ? 'bg-white text-gray-900 font-medium' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            Aperçu
          </button>
        </div>
      </div>

      {/* Content */}
      {preview ? (
        <div
          className="px-3 py-2.5 min-h-[96px] text-sm text-gray-700
            [&_strong]:font-bold [&_em]:italic
            [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5
            [&_li]:mb-0.5 [&_p]:mb-2 [&_p:last-child]:mb-0
            [&_h1]:font-bold [&_h1]:text-base [&_h1]:mb-1
            [&_h2]:font-semibold [&_h2]:text-sm [&_h2]:mb-1
            [&_hr]:border-gray-200 [&_hr]:my-2"
        >
          {value.trim() ? (
            <ReactMarkdown>{value}</ReactMarkdown>
          ) : (
            <p className="text-gray-400 italic">Aucun contenu à prévisualiser.</p>
          )}
        </div>
      ) : (
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className="w-full px-3 py-2.5 text-sm resize-y focus:outline-none bg-white font-mono"
        />
      )}
    </div>
  );
}
