"use client";

import { useEffect, useId, useState } from "react";
import { isGoogleMapsConfigured, suggestPlaces, type PlaceSuggestion } from "@/lib/maps";

type Props = {
  id?: string;
  name: string;
  label: string;
  placeholder?: string;
  defaultValue?: string;
  required?: boolean;
};

/**
 * Address input with Google Places Autocomplete when configured.
 * Degrades to a plain text field in Phase 0 without an API key.
 */
export function AddressAutocompleteInput({
  id,
  name,
  label,
  placeholder,
  defaultValue,
  required,
}: Props) {
  const autoId = useId();
  const inputId = id || autoId;
  const [value, setValue] = useState(defaultValue || "");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const mapsReady = isGoogleMapsConfigured();

  useEffect(() => {
    if (!mapsReady || value.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    const handle = setTimeout(async () => {
      const next = await suggestPlaces(value);
      setSuggestions(next.slice(0, 5));
    }, 250);
    return () => clearTimeout(handle);
  }, [value, mapsReady]);

  return (
    <div className="field" style={{ position: "relative" }}>
      <label className="label" htmlFor={inputId}>
        {label}
      </label>
      <input
        className="input"
        id={inputId}
        name={name}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
      />
      {suggestions.length > 0 && (
        <ul
          style={{
            listStyle: "none",
            margin: 0,
            padding: "0.35rem 0",
            position: "absolute",
            left: 0,
            right: 0,
            top: "100%",
            zIndex: 20,
            background: "var(--bg-elevated)",
            border: "1px solid var(--line)",
            borderRadius: 12,
          }}
        >
          {suggestions.map((s) => (
            <li key={s.placeId}>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ width: "100%", justifyContent: "flex-start", borderRadius: 0 }}
                onClick={() => {
                  setValue(s.description);
                  setSuggestions([]);
                }}
              >
                {s.description}
              </button>
            </li>
          ))}
        </ul>
      )}
      {!mapsReady && (
        <p className="muted" style={{ fontSize: "0.8rem", marginTop: "0.35rem" }}>
          Google Maps key not set — free-text address mode.
        </p>
      )}
    </div>
  );
}
