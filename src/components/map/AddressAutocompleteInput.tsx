"use client";

import { useEffect, useRef } from "react";

type Props = {
  value: string;
  onChange: (value: string, place?: { lat?: number; lng?: number; formatted?: string }) => void;
  name: string;
  placeholder?: string;
  required?: boolean;
  id?: string;
};

export function AddressAutocompleteInput({
  value,
  onChange,
  name,
  placeholder,
  required,
  id,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    if (!key || !inputRef.current) return;
    let cancelled = false;

    async function load() {
      const { importLibrary, setOptions } = await import("@googlemaps/js-api-loader");
      setOptions({ key: key! });
      await importLibrary("places");
      if (cancelled || !inputRef.current) return;
      const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
        fields: ["formatted_address", "geometry"],
        componentRestrictions: { country: ["pt"] },
      });
      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        onChange(place.formatted_address || inputRef.current?.value || "", {
          formatted: place.formatted_address,
          lat: place.geometry?.location?.lat(),
          lng: place.geometry?.location?.lng(),
        });
      });
    }

    load().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [key, onChange]);

  return (
    <input
      ref={inputRef}
      id={id}
      name={name}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      className="field"
      autoComplete="street-address"
    />
  );
}
