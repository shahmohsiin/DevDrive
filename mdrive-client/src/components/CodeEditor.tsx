import React, { useRef } from 'react';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
}

export function CodeEditor({ value, onChange, language = 'text' }: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);

  // Sync scroll between textarea and the visual layer (if we add highlighting later)
  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (preRef.current) {
      preRef.current.scrollTop = e.currentTarget.scrollTop;
      preRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;

      // Insert 2 spaces for tab
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      onChange(newValue);

      // Reset cursor position after React re-renders
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
        }
      }, 0);
    }
  };

  const lineCount = value.split('\n').length;

  return (
    <div className="flex-1 w-full h-full bg-surface-secondary flex overflow-hidden font-mono text-sm leading-relaxed">
      {/* Line Numbers */}
      <div className="w-12 bg-surface-active/30 text-text-muted text-right pr-3 pt-[25px] select-none border-r border-border-default opacity-50">
        {Array.from({ length: Math.max(lineCount, 1) }).map((_, i) => (
          <div key={i} className="h-[21px]">{i + 1}</div>
        ))}
      </div>

      {/* Editor Surface */}
      <div className="relative flex-1 group">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          className="absolute inset-0 w-full h-full p-6 pt-[25px] bg-transparent text-text-primary outline-none resize-none caret-blue-500 overflow-auto z-10 scrollbar-thin selection:bg-blue-500/30 whitespace-pre"
        />
        
        {/* Shadow Layer for syntax highlighting background if needed in future */}
        <pre 
          ref={preRef}
          aria-hidden="true"
          className="absolute inset-0 w-full h-full p-6 pt-[25px] bg-transparent text-transparent pointer-events-none overflow-hidden whitespace-pre select-none"
        >
          {value}
        </pre>
      </div>

      {/* Language Indicator */}
      <div className="absolute top-3 right-6 flex items-center gap-2">
        <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-none">
          {language}
        </span>
      </div>
    </div>
  );
}
