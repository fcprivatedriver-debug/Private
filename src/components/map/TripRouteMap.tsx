type Props = {
  pickupAddress: string;
  dropoffAddress: string;
  pickupLat?: number | null;
  pickupLng?: number | null;
  dropoffLat?: number | null;
  dropoffLng?: number | null;
  className?: string;
};

/**
 * Google Maps embed for trip routes.
 * Uses the public maps embed URL (works without JS API key).
 */
export function TripRouteMap({
  pickupAddress,
  dropoffAddress,
  pickupLat,
  pickupLng,
  dropoffLat,
  dropoffLng,
  className,
}: Props) {
  const hasCoords =
    pickupLat != null &&
    pickupLng != null &&
    dropoffLat != null &&
    dropoffLng != null;

  const origin = hasCoords
    ? `${pickupLat},${pickupLng}`
    : encodeURIComponent(pickupAddress);
  const destination = hasCoords
    ? `${dropoffLat},${dropoffLng}`
    : encodeURIComponent(dropoffAddress);

  const src = `https://www.google.com/maps?saddr=${origin}&daddr=${destination}&output=embed&hl=pt`;

  return (
    <div className={`trip-map ${className || ""}`.trim()}>
      <iframe
        title="Route map"
        src={src}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
    </div>
  );
}
