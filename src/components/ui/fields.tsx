import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { forwardRef, useId, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

const base =
  'w-full rounded-control border bg-ink/40 px-3 text-sm text-limestone placeholder:text-steel/70 transition-colors focus:border-copper/60';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(base, 'h-10', className)} {...props} />
  ),
);
Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn(base, 'min-h-[92px] py-2.5 leading-relaxed', className)} {...props} />
  ),
);
Textarea.displayName = 'Textarea';

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select ref={ref} className={cn(base, 'h-10 pr-8', className)} {...props}>
      {children}
    </select>
  ),
);
Select.displayName = 'Select';

export function Field({
  label,
  hint,
  children,
  className,
  htmlFor,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
  htmlFor?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-steel">
        {label}
      </label>
      {children}
      {hint ? <p className="text-2xs text-steel">{hint}</p> : null}
    </div>
  );
}

/** Free-text tag entry: comma or Enter commits, Backspace on empty removes. */
export function TagInput({
  tags,
  onChange,
  suggestions = [],
  placeholder = 'Add a tag',
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
}) {
  const [draft, setDraft] = useState('');
  const listId = useId();

  const commit = (value: string) => {
    const tag = value.trim().replace(/^#/, '');
    if (!tag) return;
    if (!tags.includes(tag)) onChange([...tags, tag]);
    setDraft('');
  };

  return (
    <div className="rounded-control border bg-ink/40 p-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-steel/15 py-0.5 pl-2 pr-1 text-2xs text-limestone"
          >
            {tag}
            <button
              type="button"
              onClick={() => onChange(tags.filter((t) => t !== tag))}
              aria-label={`Remove tag ${tag}`}
              className="grid h-4 w-4 place-items-center rounded-full hover:bg-critical/25 hover:text-critical"
            >
              <X size={11} />
            </button>
          </span>
        ))}
        <input
          value={draft}
          list={suggestions.length ? listId : undefined}
          onChange={(event) => {
            const value = event.target.value;
            if (value.endsWith(',')) commit(value.slice(0, -1));
            else setDraft(value);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              commit(draft);
            } else if (event.key === 'Backspace' && !draft && tags.length) {
              onChange(tags.slice(0, -1));
            }
          }}
          onBlur={() => commit(draft)}
          placeholder={tags.length ? '' : placeholder}
          className="min-w-[8ch] flex-1 bg-transparent px-1.5 py-1 text-sm text-limestone placeholder:text-steel/70 focus:outline-none"
        />
      </div>
      {suggestions.length ? (
        <datalist id={listId}>
          {suggestions.map((tag) => (
            <option key={tag} value={tag} />
          ))}
        </datalist>
      ) : null}
    </div>
  );
}
