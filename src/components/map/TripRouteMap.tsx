"use client";

type Props = {
  origin?: string;
  destination?: string;
  className?: string;
};

export function TripRouteMap({ origin, destination, className }: Props) {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key || !origin || !destination) {
    return (
      <div className={`map-fallback ${className || ""}`}>
        <p>Trajeto estimado</p>
        <p className="muted">
          {origin || "Origem"} → {destination || "Destino"}
        </p>
      </div>
    );
  }

  const src = `https://www.google.com/maps/embed/v1/directions?key=${key}&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&mode=driving`;
  return (
    <iframe
      title="Mapa do trajeto"
      className={`map-embed ${className || ""}`}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      src={src}
    />
  );
}
