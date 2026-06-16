import { SegmentedControl } from "./segmented-control";

type TimeframePickerProps = {
  value: string;
  onChange(value: string): void;
};

export function TimeframePicker({ value, onChange }: TimeframePickerProps): JSX.Element {
  return (
    <SegmentedControl
      label="K 线周期"
      value={value}
      onChange={onChange}
      options={[
        { value: "15m", label: "15m" },
        { value: "1h", label: "1H" },
        { value: "4h", label: "4H" },
        { value: "1d", label: "日线" },
        { value: "1w", label: "周线" },
        { value: "1mo", label: "月线" }
      ]}
    />
  );
}
