import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface GeographicSpreadProps {
  industry1: string;
  industry2: string;
  locations1: Array<{ country: string; lat: number; lon: number }>;
  locations2: Array<{ country: string; lat: number; lon: number }>;
}

const industryColors = {
  first: '#25a9e0',
  second: '#f05a9d',
};

function addMarkers(
  map: L.Map,
  locations: Array<{ country: string; lat: number; lon: number }>,
  industry: string,
  color: string,
) {
  return locations.map((location) =>
    L.circleMarker([location.lat, location.lon], {
      radius: 7,
      color,
      fillColor: color,
      fillOpacity: 0.78,
      opacity: 0.95,
      weight: 2,
    })
      .bindPopup(
        `<strong>${industry}</strong><br/>${location.country}<br/>${location.lat.toFixed(3)}, ${location.lon.toFixed(3)}`,
      )
      .addTo(map),
  );
}

export function GeographicSpread({ industry1, industry2, locations1, locations2 }: GeographicSpreadProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    const map = L.map(containerRef.current, {
      center: [56, 10],
      zoom: 4,
      scrollWheelZoom: false,
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    const markers = [
      ...addMarkers(map, locations1, industry1, industryColors.first),
      ...addMarkers(map, locations2, industry2, industryColors.second),
    ];

    const points = [...locations1, ...locations2].map((location) => [location.lat, location.lon] as L.LatLngTuple);
    if (points.length > 0) {
      map.fitBounds(L.latLngBounds(points), { padding: [28, 28], maxZoom: 7 });
    } else {
      map.setView([56, 10], 4);
    }

    return () => {
      markers.forEach((marker) => marker.remove());
    };
  }, [industry1, industry2, locations1, locations2]);

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-lg border border-[#d9e2e8]">
        <div ref={containerRef} className="h-[360px] w-full" />
      </div>
      <div className="flex flex-wrap justify-center gap-6">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded-full bg-[#25a9e0]" />
          <span className="text-sm text-[#526371]">{industry1}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded-full bg-[#f05a9d]" />
          <span className="text-sm text-[#526371]">{industry2}</span>
        </div>
      </div>
    </div>
  );
}
