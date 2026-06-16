import type { ChangeEvent } from "react";
import type { ControlOption } from "../types/control-option.types";

type SelectProps = {
  id: string;
  label: string;
  options: ControlOption[];
  value: string;
  onChange(value: string): void;
};

export function Select({ id, label, options, value, onChange }: SelectProps): JSX.Element {
  return (
    <label className="gi-select" htmlFor={id}>
      <span>{label}</span>
      <select id={id} value={value} onChange={(event: ChangeEvent<HTMLSelectElement>) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
