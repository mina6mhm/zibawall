// components/MapPicker.tsx
// نکته: این کامپوننت باید با dynamic(() => import(...), { ssr: false }) لود شود،
// چون leaflet موقع import به window دسترسی دارد.
'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
// آیکون‌ها از خود پکیج leaflet و از سرور خودت سرو می‌شوند (نه از unpkg.com که ممکنه کند/فیلتر باشه)
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const customIcon = L.icon({
  iconUrl: markerIcon.src,
  iconRetinaUrl: markerIcon2x.src,
  shadowUrl: markerShadow.src,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// سرور تایل OSM برای ترافیک بالا مناسب نیست و ممکنه محدودت کنه (طبق Tile Usage Policy).
// برای پروداکشن آدرس یک سرویس تایل مناسب (MapTiler، Neshan، سرور تایل اختصاصی و ...) رو
// توی NEXT_PUBLIC_MAP_TILE_URL بگذار، مثلاً: https://tiles.example.com/{z}/{x}/{y}.png
const TILE_URL =
  process.env.NEXT_PUBLIC_MAP_TILE_URL || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

interface MapPickerProps {
  position: [number, number];
  setPosition: (pos: [number, number]) => void;
}

function LocationMarker({ position, setPosition }: MapPickerProps) {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });

  return <Marker position={position} icon={customIcon} />;
}

// اگر position از بیرون عوض شد (مثلاً GPS یا جستجو) و مارکر خارج از دید بود، نقشه می‌رود سمتش.
// (center در MapContainer فقط بار اول اعمال می‌شود)
function RecenterIfNeeded({ position }: { position: [number, number] }) {
  const map = useMap();
  const [lat, lng] = position;

  useEffect(() => {
    if (!map.getBounds().contains([lat, lng])) {
      map.setView([lat, lng], map.getZoom(), { animate: true });
    }
  }, [map, lat, lng]);

  return null;
}

export default function MapPicker({ position, setPosition }: MapPickerProps) {
  return (
    <MapContainer
      center={position}
      zoom={13}
      style={{ height: '100%', width: '100%', zIndex: 0 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url={TILE_URL}
        maxZoom={19}
      />
      <RecenterIfNeeded position={position} />
      <LocationMarker position={position} setPosition={setPosition} />
    </MapContainer>
  );
}