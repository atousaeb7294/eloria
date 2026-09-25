"use client";

import { useId, useState } from "react";
import { gramsToSoot, weightToGrams, type WeightUnit } from "@/lib/weight-units";

export function AdminWeightInput({ name, defaultValue, label, className, required = false }: {
  name: string; defaultValue: string; label: string; className: string; required?: boolean;
}) {
  const id = useId();
  const [unit, setUnit] = useState<WeightUnit>("gram");
  const [value, setValue] = useState(defaultValue);
  const [error, setError] = useState("");
  let grams: string | null = null;
  try { grams = weightToGrams(value, unit); } catch { /* Server also validates. */ }
  function changeUnit(next: WeightUnit) {
    try {
      const current = weightToGrams(value, unit);
      setValue(current === null ? "" : next === "soot" ? gramsToSoot(current) : current);
      setUnit(next);
      setError("");
    } catch (cause) { setError((cause as Error).message); }
  }
  return <div className="min-w-0">
    <label className="mb-2 block text-sm text-[#d5c5a2]" htmlFor={id}>{label}</label>
    <div className="grid grid-cols-[minmax(0,1fr)_6rem] gap-2">
      <input id={id} className={className} dir="ltr" inputMode={unit === "soot" ? "numeric" : "decimal"}
        name={name} value={value} required={required} aria-describedby={`${id}-hint`}
        onChange={event => { setValue(event.target.value); setError(""); }} />
      <select className={className} aria-label={`واحد ${label}`} name={`${name}Unit`} value={unit}
        onChange={event => changeUnit(event.target.value as WeightUnit)}>
        <option value="gram">گرم</option><option value="soot">سوت</option>
      </select>
    </div>
    <p id={`${id}-hint`} className="mt-1.5 text-xs leading-6 text-[#a99c80]">
      {error || (grams !== null ? `${grams} گرم = ${gramsToSoot(grams)} سوت` : "هر ۱۰۰۰ سوت = ۱ گرم")}
    </p>
  </div>;
}
