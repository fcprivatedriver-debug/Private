"use client";

import { useEffect, useId, useRef, useState } from "react";

type PlaceSuggestion = {
  placeId: string;
  description: string;
  lat?: number;
  lng?: number;
};

type Props = {
  id?: string;
  name: string;
  label: string;
  placeholder?: string;
  defaultValue?: string;
  required?: boolean;
  onChangeValue?: (value: string) => void;
  onPlaceSelect?: (place: {
    description: string;
    placeId: string;
    lat?: number;
    lng?: number;
  }) => void;
};

/**
 * Address input with Places Autocomplete via server API.
 * Uses Google when the server has a Maps key; falls back to Nominatim.
 */
export function AddressAutocompleteInput({
  id,
  name,
  label,
  placeholder,
  defaultValue,
  required,
  onChangeValue,
  onPlaceSelect,
}: Props) {
  const autoId = useId();
  const inputId = id || autoId;
  const [value, setValue] = useState(defaultValue || "");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [googleConfigured, setGoogleConfigured] = useState<boolean | null>(null);
  const sessionTokenRef = useRef(
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `sess-${Date.now()}`,
  );
  const abortRef = useRef<AbortController | null>(null);

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
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const qs = new URLSearchParams({
          q: value.trim(),
          sessionToken: sessionTokenRef.current,
        });
        const res = await fetch(`/api/places/autocomplete?${qs}`, {
          signal: controller.signal,
        });
        const data = (await res.json()) as {
          suggestions?: PlaceSuggestion[];
          configured?: boolean;
        };
        if (typeof data.configured === "boolean") {
          setGoogleConfigured(data.configured);
        }
        setSuggestions((data.suggestions ?? []).slice(0, 5));
      } catch (error) {
        if ((error as { name?: string })?.name === "AbortError") return;
        setSuggestions([]);
      }
    }, 280);

    return () => {
      clearTimeout(handle);
      abortRef.current?.abort();
    };
  }, [value]);

  async function selectSuggestion(s: PlaceSuggestion) {
    updateValue(s.description);
    setSuggestions([]);

    let lat = s.lat;
    let lng = s.lng;

    if ((!lat || !lng) && s.placeId && !s.placeId.startsWith("osm:")) {
      try {
        const qs = new URLSearchParams({
          placeId: s.placeId,
          sessionToken: sessionTokenRef.current,
        });
        const res = await fetch(`/api/places/details?${qs}`);
        if (res.ok) {
          const details = (await res.json()) as {
            formattedAddress?: string;
            lat?: number;
            lng?: number;
          };
          if (details.formattedAddress) updateValue(details.formattedAddress);
          lat = details.lat;
          lng = details.lng;
        }
      } catch {
        // keep description-only selection
      }
    }

    onPlaceSelect?.({
      description: s.description,
      placeId: s.placeId,
      lat,
      lng,
    });

    // New billing session after a successful selection
    sessionTokenRef.current =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `sess-${Date.now()}`;
  }

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
                onClick={() => void selectSuggestion(s)}
              >
                {s.description}
              </button>
            </li>
          ))}
        </ul>
      )}
      {googleConfigured === false && (
        <p className="muted" style={{ fontSize: "0.8rem", marginTop: "0.35rem" }}>
          Google Maps key not set — free-text address mode. Defina{" "}
          <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> (ou{" "}
          <code>GOOGLE_MAPS_API_KEY</code>) no ambiente Vercel e faça redeploy.
        </p>
      )}
    </div>
  );
}
