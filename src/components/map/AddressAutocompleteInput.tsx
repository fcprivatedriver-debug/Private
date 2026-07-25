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
  onChangeValue?: (value: string) => void;
};

/**
 * Address input with Google Places Autocomplete when configured.
 * Falls back to OpenStreetMap Nominatim suggestions without an API key.
 */
export function AddressAutocompleteInput({
  id,
  name,
  label,
  placeholder,
  defaultValue,
  required,
  onChangeValue,
}: Props) {
  const autoId = useId();
  const inputId = id || autoId;
  const [value, setValue] = useState(defaultValue || "");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const mapsReady = isGoogleMapsConfigured();

  function updateValue(next: string) {
    setValue(next);
    onChangeValue?.(next);
  }

  useEffect(() => {
    if (value.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    const handle = setTimeout(async () => {
      if (mapsReady) {
        const next = await suggestPlaces(value);
        setSuggestions(next.slice(0, 5));
        return;
      }
      try {
        const url = new URL("https://nominatim.openstreetmap.org/search");
        url.searchParams.set("q", value);
        url.searchParams.set("format", "json");
        url.searchParams.set("limit", "5");
        url.searchParams.set("addressdetails", "0");
        const res = await fetch(url.toString(), {
          headers: { Accept: "application/json" },
        });
        if (!res.ok) {
          setSuggestions([]);
          return;
        }
        const data = (await res.json()) as { place_id: number; display_name: string }[];
        setSuggestions(
          data.map((d) => ({
            placeId: String(d.place_id),
            description: d.display_name,
          })),
        );
      } catch {
        setSuggestions([]);
      }
    }, 300);
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
        onChange={(e) => updateValue(e.target.value)}
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
                  updateValue(s.description);
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
          Sugestões via OpenStreetMap (defina NEXT_PUBLIC_GOOGLE_MAPS_API_KEY para Google Places).
        </p>
      )}
    </div>
  );
}
