"use client";

import { useEffect, useId, useState } from "react";
import { useLocale } from "next-intl";

export type SelectedPlace = {
  description: string;
  placeId?: string;
  lat?: number;
  lng?: number;
};

type Suggestion = {
  placeId: string;
  description: string;
  mainText?: string;
  secondaryText?: string;
};

type Props = {
  id?: string;
  name: string;
  label: string;
  placeholder?: string;
  defaultValue?: string;
  required?: boolean;
  onPlaceChange?: (place: SelectedPlace) => void;
};

/**
 * Google Places Autocomplete via server API (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY).
 */
export function AddressAutocompleteInput({
  id,
  name,
  label,
  placeholder,
  defaultValue,
  required,
  onPlaceChange,
}: Props) {
  const autoId = useId();
  const inputId = id || autoId;
  const locale = useLocale();
  const [value, setValue] = useState(defaultValue || "");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [mapsReady, setMapsReady] = useState(true);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/maps/status")
      .then((r) => r.json())
      .then((d) => setMapsReady(Boolean(d.configured)))
      .catch(() => setMapsReady(false));
  }, []);

  useEffect(() => {
    if (!mapsReady || value.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const qs = new URLSearchParams({ input: value, locale });
        const res = await fetch(`/api/places/autocomplete?${qs}`);
        const data = await res.json();
        if (res.ok) {
          setSuggestions(data.suggestions || []);
          setOpen(true);
        } else {
          setSuggestions([]);
        }
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => clearTimeout(handle);
  }, [value, mapsReady, locale]);

  function updateText(next: string) {
    setValue(next);
    onPlaceChange?.({ description: next });
  }

  async function selectSuggestion(s: Suggestion) {
    setValue(s.description);
    setSuggestions([]);
    setOpen(false);
    try {
      const res = await fetch(
        `/api/places/details?placeId=${encodeURIComponent(s.placeId)}`,
      );
      if (res.ok) {
        const details = await res.json();
        onPlaceChange?.({
          description: details.formattedAddress || s.description,
          placeId: details.placeId || s.placeId,
          lat: details.lat,
          lng: details.lng,
        });
        if (details.formattedAddress) setValue(details.formattedAddress);
        return;
      }
    } catch {
      /* fall through */
    }
    onPlaceChange?.({ description: s.description, placeId: s.placeId });
  }

  return (
    <div className="field places-field">
      <label className="label" htmlFor={inputId}>
        {label}
      </label>
      <input
        className="input"
        id={inputId}
        name={name}
        value={value}
        onChange={(e) => updateText(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onBlur={() => {
          // Allow click on suggestion before closing
          window.setTimeout(() => setOpen(false), 180);
        }}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
        role="combobox"
        aria-expanded={open && suggestions.length > 0}
        aria-autocomplete="list"
      />
      {loading && (
        <p className="muted places-hint">…</p>
      )}
      {open && suggestions.length > 0 && (
        <ul className="places-suggestions" role="listbox">
          {suggestions.map((s) => (
            <li key={s.placeId} role="option">
              <button
                type="button"
                className="places-suggestion"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectSuggestion(s)}
              >
                <span className="places-suggestion-main">
                  {s.mainText || s.description}
                </span>
                {s.secondaryText && (
                  <span className="places-suggestion-secondary">{s.secondaryText}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
