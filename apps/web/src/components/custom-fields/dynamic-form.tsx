'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CustomFieldDefinition {
  id: string;
  name: string;
  key: string;
  type: string;
  isRequired: boolean;
  isReadonly: boolean;
  isHidden: boolean;
  placeholder?: string;
  helpText?: string;
  defaultValue?: string;
  mask?: string;
  options?: { label: string; value: string; color?: string }[];
}

export function DynamicInput({
  field,
  value,
  onChange,
  error,
}: {
  field: CustomFieldDefinition;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  if (field.isHidden) return null;

  const inputProps = {
    id: field.key,
    placeholder: field.placeholder || field.name,
    disabled: field.isReadonly,
    value: value || '',
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      onChange(e.target.value),
  };

  const renderInput = () => {
    switch (field.type) {
      case 'textarea':
      case 'rich_text':
      case 'markdown':
        return (
          <textarea
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            rows={4}
            {...(inputProps as any)}
          />
        );

      case 'select':
      case 'radio':
        return (
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            disabled={field.isReadonly}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
          >
            <option value="">Selecione...</option>
            {(field.options || []).map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );

      case 'multiselect':
        return (
          <div className="flex flex-wrap gap-1 p-2 border rounded-md min-h-[40px]">
            {(value || '')
              .split(',')
              .filter(Boolean)
              .map((v) => (
                <span
                  key={v}
                  className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary flex items-center gap-1"
                >
                  {v}
                  <button
                    onClick={() => {
                      const newVal = (value || '')
                        .split(',')
                        .filter((b) => b !== v)
                        .join(',');
                      onChange(newVal);
                    }}
                    className="hover:text-destructive"
                  >
                    &times;
                  </button>
                </span>
              ))}
            <select
              className="flex-1 min-w-[120px] bg-transparent text-sm border-none outline-none"
              value=""
              onChange={(e) => {
                if (!e.target.value) return;
                const current = (value || '').split(',').filter(Boolean);
                if (!current.includes(e.target.value)) {
                  onChange([...current, e.target.value].join(','));
                }
              }}
            >
              <option value="">+ Adicionar</option>
              {(field.options || []).map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        );

      case 'boolean':
      case 'checkbox':
        return (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={value === 'true'}
              onChange={(e) => onChange(e.target.checked ? 'true' : 'false')}
              className="h-4 w-4 rounded border-primary"
            />
            <span className="text-sm">{field.name}</span>
          </label>
        );

      case 'number':
      case 'decimal':
      case 'currency':
      case 'percentual':
        return <Input type="number" step="any" {...(inputProps as any)} />;

      case 'email':
        return <Input type="email" {...(inputProps as any)} />;

      case 'url':
        return <Input type="url" {...(inputProps as any)} />;

      case 'phone':
        return <Input type="tel" {...(inputProps as any)} />;

      case 'date':
        return <Input type="date" {...(inputProps as any)} />;

      case 'time':
        return <Input type="time" {...(inputProps as any)} />;

      case 'datetime':
        return <Input type="datetime-local" {...(inputProps as any)} />;

      case 'color':
        return <Input type="color" className="h-10 w-20 p-1" {...(inputProps as any)} />;

      case 'json':
        return (
          <textarea
            className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
            rows={6}
            {...(inputProps as any)}
          />
        );

      default:
        return <Input type="text" {...(inputProps as any)} />;
    }
  };

  return (
    <div className="space-y-2">
      {field.type !== 'checkbox' && field.type !== 'boolean' && (
        <Label htmlFor={field.key}>
          {field.name}
          {field.isRequired && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      {renderInput()}
      {field.helpText && <p className="text-xs text-muted-foreground">{field.helpText}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

export function DynamicForm({
  fields,
  values,
  onChange,
  errors,
}: {
  fields: CustomFieldDefinition[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  errors?: Record<string, string>;
}) {
  if (!fields.length) return null;

  return (
    <div className="space-y-4">
      {fields
        .filter((f) => !f.isHidden)
        .map((field) => (
          <DynamicInput
            key={field.id}
            field={field}
            value={values[field.key] || ''}
            onChange={(v) => onChange(field.key, v)}
            error={errors?.[field.key]}
          />
        ))}
    </div>
  );
}
