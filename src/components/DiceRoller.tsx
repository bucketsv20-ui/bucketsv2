"use client";

import { useCallback, useMemo, useState } from "react";

type DieValue = 1 | 2 | 3 | 4 | 5 | 6;

type DiceRollerProps = {
  disabled?: boolean;
  onApply: (payload: { selectedDie: DieValue; rolledDice: [DieValue, DieValue] }) => void;
};

const FACE_ROTATIONS: Record<DieValue, string> = {
  1: "rotateX(0deg) rotateY(0deg)",
  2: "rotateX(-90deg) rotateY(0deg)",
  3: "rotateX(0deg) rotateY(90deg)",
  4: "rotateX(0deg) rotateY(-90deg)",
  5: "rotateX(90deg) rotateY(0deg)",
  6: "rotateX(180deg) rotateY(0deg)",
};

function rollDie(): DieValue {
  const values: DieValue[] = [1, 2, 3, 4, 5, 6];
  const index = crypto.getRandomValues(new Uint32Array(1))[0] % values.length;
  return values[index];
}

function Pip({ className = "" }: { className?: string }) {
  return <span className={`h-2.5 w-2.5 rounded-full bg-slate-950 shadow-[0_1px_2px_rgba(15,23,42,0.4)] ${className}`} />;
}

function DieFace({ value }: { value: DieValue }) {
  return (
    <div className="relative grid h-full w-full place-items-center rounded-xl bg-gradient-to-br from-white via-slate-100 to-slate-300 p-2 shadow-inner">
      {value === 1 && <Pip />}
      {value === 2 && (
        <div className="grid h-full w-full grid-cols-2">
          <Pip className="self-start justify-self-start" />
          <Pip className="self-end justify-self-end" />
        </div>
      )}
      {value === 3 && (
        <div className="grid h-full w-full grid-cols-3 grid-rows-3">
          <Pip className="col-start-1 row-start-1" />
          <Pip className="col-start-2 row-start-2" />
          <Pip className="col-start-3 row-start-3" />
        </div>
      )}
      {value === 4 && (
        <div className="grid h-full w-full grid-cols-2 grid-rows-2">
          <Pip className="justify-self-start self-start" />
          <Pip className="justify-self-end self-start" />
          <Pip className="justify-self-start self-end" />
          <Pip className="justify-self-end self-end" />
        </div>
      )}
      {value === 5 && (
        <div className="grid h-full w-full grid-cols-3 grid-rows-3">
          <Pip className="col-start-1 row-start-1" />
          <Pip className="col-start-3 row-start-1" />
          <Pip className="col-start-2 row-start-2" />
          <Pip className="col-start-1 row-start-3" />
          <Pip className="col-start-3 row-start-3" />
        </div>
      )}
      {value === 6 && (
        <div className="grid h-full w-full grid-cols-2 grid-rows-3">
          <Pip className="justify-self-start self-start" />
          <Pip className="justify-self-end self-start" />
          <Pip className="justify-self-start self-center" />
          <Pip className="justify-self-end self-center" />
          <Pip className="justify-self-start self-end" />
          <Pip className="justify-self-end self-end" />
        </div>
      )}
    </div>
  );
}

function DieCube({ value, rolling, selected, onSelect }: { value: DieValue; rolling: boolean; selected: boolean; onSelect: () => void }) {
  const transform = useMemo(() => {
    if (rolling) return "rotateX(780deg) rotateY(900deg)";
    return FACE_ROTATIONS[value];
  }, [rolling, value]);

  return (
    <button
      type="button"
      disabled={rolling}
      onClick={onSelect}
      className={`group relative rounded-2xl p-2 transition ${selected ? "ring-2 ring-emerald-300 ring-offset-2 ring-offset-slate-950" : "hover:ring-2 hover:ring-slate-500"}`}
    >
      <div className="dice-scene h-24 w-24 md:h-28 md:w-28">
        <div className={`dice-cube ${rolling ? "dice-cube-rolling" : ""}`} style={{ transform }}>
          <div className="dice-face dice-face-front"><DieFace value={1} /></div>
          <div className="dice-face dice-face-back"><DieFace value={6} /></div>
          <div className="dice-face dice-face-right"><DieFace value={3} /></div>
          <div className="dice-face dice-face-left"><DieFace value={4} /></div>
          <div className="dice-face dice-face-top"><DieFace value={5} /></div>
          <div className="dice-face dice-face-bottom"><DieFace value={2} /></div>
        </div>
      </div>
      <span className="mt-2 block text-center text-sm font-semibold text-slate-200">{value}</span>
      <span className="pointer-events-none absolute inset-0 rounded-2xl bg-white/0 transition group-hover:bg-white/5" />
    </button>
  );
}

export default function DiceRoller({ disabled = false, onApply }: DiceRollerProps) {
  const [rolling, setRolling] = useState(false);
  const [rolledDice, setRolledDice] = useState<[DieValue, DieValue] | null>(null);
  const [selectedDie, setSelectedDie] = useState<DieValue | null>(null);

  const handleRoll = useCallback(() => {
    if (disabled || rolling) return;
    setRolling(true);
    setSelectedDie(null);

    window.setTimeout(() => {
      const nextDice: [DieValue, DieValue] = [rollDie(), rollDie()];
      setRolledDice(nextDice);
      setRolling(false);
    }, 950);
  }, [disabled, rolling]);

  const canApply = !!rolledDice && selectedDie !== null && !rolling;

  return (
    <div className="rounded-2xl border border-slate-700/90 bg-gradient-to-br from-slate-950 to-slate-900 p-4 md:p-5 shadow-[0_16px_40px_rgba(16,185,129,0.12)] space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-emerald-100">Roll Two Dice</h3>
        <button
          type="button"
          onClick={handleRoll}
          disabled={disabled || rolling}
          className="rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
        >
          {rolling ? "Rolling..." : "Roll Dice"}
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-3 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Die A</p>
          <div className="mt-2 flex justify-center">
            <DieCube
              value={rolledDice?.[0] ?? 1}
              rolling={rolling}
              selected={selectedDie !== null && rolledDice?.[0] === selectedDie}
              onSelect={() => {
                if (!rolledDice || rolling) return;
                setSelectedDie(rolledDice[0]);
              }}
            />
          </div>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-3 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Die B</p>
          <div className="mt-2 flex justify-center">
            <DieCube
              value={rolledDice?.[1] ?? 1}
              rolling={rolling}
              selected={selectedDie !== null && rolledDice?.[1] === selectedDie}
              onSelect={() => {
                if (!rolledDice || rolling) return;
                setSelectedDie(rolledDice[1]);
              }}
            />
          </div>
        </div>
      </div>

      {rolledDice && (
        <p className="text-sm text-slate-300">
          Final roll: <span className="font-semibold text-emerald-200">{rolledDice[0]}</span> and <span className="font-semibold text-emerald-200">{rolledDice[1]}</span>
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-200">Selected: <span className="font-semibold text-emerald-300">{selectedDie ?? "None"}</span></p>
        <button
          type="button"
          disabled={!canApply}
          onClick={() => {
            if (!rolledDice || selectedDie === null) return;
            onApply({ selectedDie, rolledDice });
          }}
          className="rounded-lg border border-emerald-400/60 px-4 py-2 text-sm font-medium text-emerald-200 transition hover:bg-emerald-400/10 disabled:cursor-not-allowed disabled:border-slate-700 disabled:text-slate-500"
        >
          Use Selected Die
        </button>
      </div>
    </div>
  );
}
