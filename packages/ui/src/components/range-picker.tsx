import { SegmentedControl } from "./segmented-control";

type RangePickerProps = {
  value: string;
  onChange(value: string): void;
};

export function RangePicker({ value, onChange }: RangePickerProps): JSX.Element {
  return (
    <SegmentedControl
      label="时间跨度"
      value={value}
      onChange={onChange}
      options={[
        { value: "1m", label: "1个月" },
        { value: "3m", label: "3个月" },
        { value: "6m", label: "6个月" },
        { value: "1y", label: "1年" },
        { value: "3y", label: "3年" },
        { value: "5y", label: "5年" }
      ]}
    />
  );
}
