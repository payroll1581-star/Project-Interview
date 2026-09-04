import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import clsx from 'clsx';

const fieldClasses =
  'block w-full rounded-lg border-0 px-3 py-2 text-sm text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600';

function Label({ label, htmlFor }: { label: string; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-xs font-medium text-slate-700">
      {label}
    </label>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ label, id, className, ...props }, ref) => (
  <div>
    <Label label={label} htmlFor={id} />
    <input ref={ref} id={id} className={clsx(fieldClasses, className)} {...props} />
  </div>
));
Input.displayName = 'Input';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, id, className, ...props }, ref) => (
    <div>
      <Label label={label} htmlFor={id} />
      <textarea ref={ref} id={id} className={clsx(fieldClasses, className)} {...props} />
    </div>
  ),
);
Textarea.displayName = 'Textarea';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, id, className, children, ...props }, ref) => (
    <div>
      <Label label={label} htmlFor={id} />
      <select ref={ref} id={id} className={clsx(fieldClasses, 'bg-white', className)} {...props}>
        {children}
      </select>
    </div>
  ),
);
Select.displayName = 'Select';
