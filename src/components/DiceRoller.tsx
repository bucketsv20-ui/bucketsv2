"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type DiceRollerProps = {
  onApply: (selectedDie: number, rolledDice: [number, number]) => void;
  disabled?: boolean;
};

function randomDie(): number {
  const randomArray = new Uint32Array(1);
  crypto.getRandomValues(randomArray);
  return (randomArray[0] % 6) + 1;
}

const pipLayouts: Record<number, string[]> = {
  1: ["center"],
  2: ["top-left", "bottom-right"],
  3: ["top-left", "center", "bottom-right"],
  4: ["top-left", "top-right", "bottom-left", "bottom-right"],
  5: ["top-left", "top-right", "center", "bottom-left", "bottom-right"],
  6: ["top-left", "top-right", "middle-left", "middle-right", "bottom-left", "bottom-right"],
};

function DieFace({ value }: { value: number }) {
  return (
    <div className="dice-face">
      {pipLayouts[value]?.map((position) => (
        <span key={`${value}-${position}`} className={`dice-pip pip-${position}`} />
      ))}
    </div>
  );
}

export default function DiceRoller({ onApply, disabled = false }: DiceRollerProps) {
  const [isRolling, setIsRolling] = useState(false);
  const [displayDice, setDisplayDice] = useState<[number, number]>([1, 1]);
  const [rolledDice, setRolledDice] = useState<[number, number] | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<0 | 1 | null>(null);
  const rollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const selectedDie = useMemo(() => {
    if (!rolledDice || selectedIndex === null) return null;
    return rolledDice[selectedIndex];
  }, [rolledDice, selectedIndex]);

  function clearRollTimer() {
    if (!rollTimerRef.current) return;
    clearInterval(rollTimerRef.current);
    rollTimerRef.current = null;
  }

  useEffect(() => () => clearRollTimer(), []);

  function handleRoll() {
    if (disabled || isRolling) return;

    setIsRolling(true);
    setSelectedIndex(null);
    setRolledDice(null);

    rollTimerRef.current = setInterval(() => {
      setDisplayDice([randomDie(), randomDie()]);
    }, 90);

    const rollDurationMs = 650 + Math.floor(Math.random() * 550);
    window.setTimeout(() => {
      clearRollTimer();
      const finalDice: [number, number] = [randomDie(), randomDie()];
      setDisplayDice(finalDice);
      setRolledDice(finalDice);
      setIsRolling(false);
    }, rollDurationMs);
  }

  function handleApply() {
    if (!rolledDice || selectedDie === null) return;
    onApply(selectedDie, rolledDice);
  }

  return (
    <div className="space-y-3 rounded-lg border border-indigo-500/30 bg-gradient-to-br from-slate-950 via-indigo-950/40 to-slate-900 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-indigo-200">Dice Roller</h3>
        <button
          type="button"
          disabled={disabled || isRolling}
          onClick={handleRoll}
          className="rounded-md bg-indigo-400 px-3 py-1.5 text-xs font-semibold text-indigo-950 transition hover:bg-indigo-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
        >
          {isRolling ? "Rolling..." : "Roll Dice"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {displayDice.map((value, index) => {
          const isSelected = selectedIndex === index;
          const canSelect = !isRolling && rolledDice !== null;
          return (
            <button
              key={index}
              type="button"
              onClick={() => canSelect && setSelectedIndex(index as 0 | 1)}
              disabled={!canSelect || disabled}
              className={`rounded-xl border p-4 text-left transition ${
                isSelected
                  ? "border-emerald-300 bg-emerald-400/20 shadow-[0_0_24px_rgba(52,211,153,0.35)]"
                  : "border-slate-700 bg-slate-900/80 hover:border-indigo-300"
              }`}
            >
              <p className="text-xs uppercase tracking-wide text-slate-400">Die {index === 0 ? "A" : "B"}</p>
              <div className="mt-2 flex items-center justify-center [perspective:800px]">
                <div className={`dice-cube ${isRolling ? `dice-cube-rolling die-${index}` : ""}`}>
                  <DieFace value={value} />
                </div>
              </div>
              <p className="mt-2 text-center text-xs font-semibold text-indigo-100">Value: {value}</p>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-indigo-100">Selected: {selectedDie ?? "—"}</p>
        <button
          type="button"
          disabled={disabled || isRolling || selectedDie === null || rolledDice === null}
          onClick={handleApply}
          className="rounded-md bg-emerald-400 px-3 py-1.5 text-xs font-semibold text-emerald-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
        >
          Use Selected Die
        </button>
      </div>
    </div>
  );
}
