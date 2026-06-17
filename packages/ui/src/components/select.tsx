import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import type { ControlOption } from "../types/control-option.types";

type SelectProps = {
  id: string;
  label: string;
  options: ControlOption[];
  value: string;
  onChange(value: string): void;
};

export function Select({ id, label, options, value, onChange }: SelectProps): JSX.Element {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [contentStyle, setContentStyle] = useState<CSSProperties>({});
  const selectedOption = useMemo(() => options.find((option) => option.value === value) ?? options[0], [options, value]);
  const selectedIndex = Math.max(options.findIndex((option) => option.value === selectedOption?.value), 0);
  const labelId = `${id}-label`;
  const listboxId = `${id}-listbox`;

  const updateContentPosition = useCallback((): void => {
    const trigger = triggerRef.current;
    if (!trigger || typeof window === "undefined") {
      return;
    }

    const rect = trigger.getBoundingClientRect();
    const gap = 7;
    const viewportPadding = 8;
    const width = Math.max(rect.width, 238);
    const left = Math.min(Math.max(viewportPadding, rect.right - width), Math.max(viewportPadding, window.innerWidth - width - viewportPadding));
    const availableBelow = window.innerHeight - rect.bottom - gap - viewportPadding;
    const availableAbove = rect.top - gap - viewportPadding;
    const shouldOpenAbove = availableBelow < 180 && availableAbove > availableBelow;
    const maxHeight = Math.min(320, Math.max(180, shouldOpenAbove ? availableAbove : availableBelow));

    setContentStyle({
      position: "fixed",
      top: shouldOpenAbove ? Math.max(viewportPadding, rect.top - gap - maxHeight) : rect.bottom + gap,
      left,
      width,
      maxHeight
    });
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    updateContentPosition();
    window.addEventListener("resize", updateContentPosition);
    window.addEventListener("scroll", updateContentPosition, true);

    return () => {
      window.removeEventListener("resize", updateContentPosition);
      window.removeEventListener("scroll", updateContentPosition, true);
    };
  }, [isOpen, updateContentPosition]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handlePointerDown = (event: PointerEvent): void => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !contentRef.current?.contains(target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen]);

  const chooseOption = (option: ControlOption): void => {
    onChange(option.value);
    setIsOpen(false);
  };

  const chooseByOffset = (offset: number): void => {
    if (options.length === 0) {
      return;
    }

    const nextIndex = (selectedIndex + offset + options.length) % options.length;
    const option = options[nextIndex];

    if (option) {
      chooseOption(option);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>): void => {
    if (event.key === "Escape") {
      setIsOpen(false);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      chooseByOffset(1);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      chooseByOffset(-1);
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setIsOpen((current) => !current);
    }
  };

  const listbox = (
    <div ref={contentRef} id={listboxId} className="gi-select__content" role="listbox" aria-labelledby={labelId} style={contentStyle}>
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <button key={option.value} type="button" className={isSelected ? "gi-select__option gi-select__option--selected" : "gi-select__option"} role="option" aria-selected={isSelected} onClick={() => chooseOption(option)}>
            <span className="gi-select__option-main">
              <span className="gi-select__option-label">{option.label}</span>
              {option.description && <span className="gi-select__option-description">{option.description}</span>}
            </span>
            {typeof option.count === "number" && <span className="gi-select__option-count">{option.count.toLocaleString("en-US")}</span>}
            <span className="gi-select__option-check" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );

  return (
    <div ref={rootRef} className="gi-select" data-open={isOpen ? "true" : "false"}>
      <span id={labelId} className="gi-select__label">{label}</span>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        className="gi-select__trigger"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-labelledby={`${labelId} ${id}`}
        aria-controls={listboxId}
        onClick={() => setIsOpen((current) => !current)}
        onKeyDown={handleKeyDown}
      >
        <span className="gi-select__value">{selectedOption?.label ?? "请选择"}</span>
        {typeof selectedOption?.count === "number" && <span className="gi-select__count">{selectedOption.count.toLocaleString("en-US")}</span>}
        <span className="gi-select__chevron" aria-hidden="true" />
      </button>
      {isOpen && (typeof document === "undefined" ? listbox : createPortal(listbox, document.body))}
    </div>
  );
}
