import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { FormField, FormSchema } from "@/lib/products.functions";

interface DynamicFormRendererProps {
  schema: FormSchema;
  values: Record<string, any>;
  onChange: (key: string, value: any) => void;
}

export function DynamicFormRenderer({ schema, values, onChange }: DynamicFormRendererProps) {
  if (!schema.fields || schema.fields.length === 0) {
    return (
      <div className="p-4 text-xs text-muted-foreground border rounded-md">
        No custom fields defined for this form.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {schema.fields.map((field: FormField) => {
        const val = values[field.id] !== undefined ? values[field.id] : "";

        return (
          <div key={field.id} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">
                {field.label}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </Label>
            </div>

            {field.type === "text" && (
              <Input
                value={val}
                onChange={(e) => onChange(field.id, e.target.value)}
                placeholder={field.placeholder || `Enter ${field.label}`}
                className="h-9 text-xs"
                required={field.required}
              />
            )}

            {field.type === "number" && (
              <Input
                type="number"
                value={val}
                onChange={(e) => onChange(field.id, e.target.value)}
                placeholder={field.placeholder || `Enter ${field.label}`}
                className="h-9 text-xs"
                required={field.required}
              />
            )}

            {field.type === "textarea" && (
              <Textarea
                value={val}
                onChange={(e) => onChange(field.id, e.target.value)}
                placeholder={field.placeholder || `Enter ${field.label}`}
                className="text-xs min-h-[70px]"
                required={field.required}
              />
            )}

            {field.type === "select" && (
              <Select value={String(val)} onValueChange={(v) => onChange(field.id, v)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder={`Select ${field.label}`} />
                </SelectTrigger>
                <SelectContent>
                  {(field.options || []).map((opt) => (
                    <SelectItem key={opt} value={opt} className="text-xs">
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {field.type === "checkbox" && (
              <div className="flex items-center justify-between p-2 rounded border bg-muted/40">
                <span className="text-xs text-muted-foreground">Enable / Active</span>
                <Switch
                  checked={Boolean(val)}
                  onCheckedChange={(checked) => onChange(field.id, checked)}
                />
              </div>
            )}

            {field.type === "date" && (
              <Input
                type="date"
                value={val}
                onChange={(e) => onChange(field.id, e.target.value)}
                className="h-9 text-xs"
                required={field.required}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
