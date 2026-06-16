import type { ControlOption } from "../types/control-option.types";
import { cn } from "../utils/class-name.utils";

type SegmentedControlProps = {
  label: string;
  options: ControlOption[];
  value: string;
  onChange(value: string): void;
};

export function SegmentedControl({ label, options, value, onChange }: SegmentedControlProps): JSX.Element {
  return (
    <div className="gi-segmented-control" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={cn("gi-segmented-control__item", option.value === value && "gi-segmented-control__item--active")}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
