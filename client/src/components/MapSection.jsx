import { useEffect, useRef } from 'react';
import L from 'leaflet';

/* ── Office marker locations (Delhi-NCR) ── */
const OFFICE_LOCATIONS = [
  { lat: 28.6139, lng: 77.2090, name: 'Central Delhi Office' },
  { lat: 28.6353, lng: 77.2250, name: 'North Delhi Office' },
  { lat: 28.5244, lng: 77.1855, name: 'South Delhi Office' },
  { lat: 28.6519, lng: 77.1581, name: 'West Delhi Office' },
  { lat: 28.6280, lng: 77.2800, name: 'East Delhi Office' },
  { lat: 28.4595, lng: 77.0266, name: 'Gurgaon Office' },
  { lat: 28.5355, lng: 77.3910, name: 'Noida Office' },
  { lat: 28.6692, lng: 77.4538, name: 'Ghaziabad Office' },
];

export default function MapSection() {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);

  useEffect(() => {
    if (mapInstance.current) return; // already initialised

    mapInstance.current = L.map(mapRef.current, {
      center: [28.6139, 77.2090],
      zoom: 11,
      zoomControl: true,
      attributionControl: false,
      scrollWheelZoom: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
    }).addTo(mapInstance.current);

    // Blue marker icon
    const blueIcon = L.icon({
      iconUrl: 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });

    OFFICE_LOCATIONS.forEach(({ lat, lng, name }) => {
      L.marker([lat, lng], { icon: blueIcon })
        .addTo(mapInstance.current)
        .bindPopup(`<strong>${name}</strong>`);
    });

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  return <div ref={mapRef} className="w-full h-full min-h-[320px]" />;
}
