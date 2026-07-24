"use client";

import { useEffect, useRef, useState } from "react";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";

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
 * Interactive Google Map with Directions route polyline.
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
  const mapRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let directionsRenderer: google.maps.DirectionsRenderer | null = null;

    async function draw() {
      if (!mapRef.current) return;
      if (!pickupAddress.trim() || !dropoffAddress.trim()) return;

      setReady(false);
      setError(null);

      try {
        const statusRes = await fetch("/api/maps/status");
        const status = await statusRes.json();
        const key =
          (status.browserKey as string | null) ||
          process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
          null;
        if (!key) {
          setError("maps_unavailable");
          return;
        }

        setOptions({ key, v: "weekly" });
        const mapsLib = await importLibrary("maps");
        const routesLib = await importLibrary("routes");

        if (cancelled || !mapRef.current) return;

        const map = new mapsLib.Map(mapRef.current, {
          zoom: 11,
          center: { lat: 38.7223, lng: -9.1393 },
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: true,
          gestureHandling: "cooperative",
          styles: [
            { featureType: "poi", stylers: [{ visibility: "off" }] },
            { featureType: "transit", stylers: [{ visibility: "simplified" }] },
          ],
        });

        directionsRenderer = new routesLib.DirectionsRenderer({
          map,
          suppressMarkers: false,
          polylineOptions: {
            strokeColor: "#1F5A96",
            strokeOpacity: 0.9,
            strokeWeight: 5,
          },
        });

        const directionsService = new routesLib.DirectionsService();
        const origin =
          pickupLat != null && pickupLng != null
            ? { lat: pickupLat, lng: pickupLng }
            : pickupAddress;
        const destination =
          dropoffLat != null && dropoffLng != null
            ? { lat: dropoffLat, lng: dropoffLng }
            : dropoffAddress;

        const result = await directionsService.route({
          origin,
          destination,
          travelMode: google.maps.TravelMode.DRIVING,
        });

        if (cancelled) return;
        directionsRenderer.setDirections(result);
        setReady(true);
        setError(null);
      } catch (err) {
        console.error("[TripRouteMap]", err);
        if (!cancelled) setError("route_failed");
      }
    }

    void draw();
    return () => {
      cancelled = true;
      directionsRenderer?.setMap(null);
    };
  }, [
    pickupAddress,
    dropoffAddress,
    pickupLat,
    pickupLng,
    dropoffLat,
    dropoffLng,
  ]);

  return (
    <div className={`trip-map ${className || ""}`.trim()}>
      <div ref={mapRef} className="trip-map-canvas" />
      {!ready && !error && <div className="trip-map-overlay">…</div>}
      {error && (
        <div className="trip-map-overlay trip-map-overlay-error">
          Não foi possível desenhar a rota.
        </div>
      )}
    </div>
  );
}
