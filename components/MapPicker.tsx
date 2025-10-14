// MapPicker.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import L, { LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import { shopRes } from "@/types/Shops";


function FlyToSelected({
  selectedShop,
  selectZoom,
  defaultCenter,
  defaultZoom,
}: {
  selectedShop: shopRes | null;
  selectZoom: number;
  defaultCenter: LatLngExpression;
  defaultZoom: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (!selectedShop) {
      // no selection -> optionally reset view to default
      // uncomment if you want to reset to default when selection is cleared
      // map.setView(defaultCenter, defaultZoom);
      return;
    }

    const lat = parseFloat(selectedShop.geoLat || "0");
    const lon = parseFloat(selectedShop.geoLng || "0");
    if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
      // use flyTo for smooth animation; fallback to setView if something goes wrong
      try {
        map.flyTo([lat, lon], selectZoom, { duration: 0.8 });
      } catch {
        map.setView([lat, lon], selectZoom);
      }
    }
  }, [map, selectedShop, selectZoom, defaultCenter, defaultZoom]);

  return null;
}

export default function MapPicker({
  shops,
  selectedAddress,
  onSelect,
}: {
  shops: shopRes[];
  selectedAddress?: string;
  onSelect: (address: string) => void;
}) {
  const center: LatLngExpression = [52.2305, 21.0069];
  const DEFAULT_ZOOM = 13;
  const SELECT_ZOOM = 15;

  const blueIcon = useMemo(
    () =>
      new L.Icon({
        iconUrl:
          "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      }),
    []
  );

  const redIcon = useMemo(
    () =>
      new L.Icon({
        iconUrl:
          "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      }),
    []
  );

  const [selectedId, setSelectedId] = useState<number | null>(null);

  // sync parent-selectedAddress -> selectedId
  useEffect(() => {
    if (!selectedAddress) {
      setSelectedId(null);
      return;
    }
    const matched = shops.find((s) => s.addressShop === selectedAddress);
    setSelectedId(matched ? matched.idShop : null);
  }, [selectedAddress, shops]);

  // compute currently selected Shop (used by FlyToSelected)
  const selectedShop = selectedId != null ? shops.find((s) => s.idShop === selectedId) ?? null : null;

  return (
    <div className="h-64 w-full rounded-lg overflow-hidden border border-gray-600 mt-3">
      <MapContainer
        center={center}
        zoom={DEFAULT_ZOOM}
        style={{ height: "100%", width: "100%" }}
        className="bg-gray-900"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />

        {/* This component uses `useMap()` to call flyTo when selectedShop changes */}
        <FlyToSelected
          selectedShop={selectedShop}
          selectZoom={SELECT_ZOOM}
          defaultCenter={center}
          defaultZoom={DEFAULT_ZOOM}
        />

        {shops.map((shop) => {
          const lat = parseFloat(shop.geoLat || "0");
          const lon = parseFloat(shop.geoLng || "0");
          if (Number.isNaN(lat) || Number.isNaN(lon)) return null;

          const isSelected = shop.idShop === selectedId;
          // include selection state in key to force Marker remount (updates icon)
          const markerKey = `${shop.idShop}-${isSelected ? "sel" : "un"}`;

          return (
            <Marker
              key={markerKey}
              position={[lat, lon]}
              icon={isSelected ? redIcon : blueIcon}
              eventHandlers={{
                click: () => {
                  setSelectedId(shop.idShop);
                  onSelect(shop.addressShop);
                  // Fly handled by FlyToSelected (useMap) because selectedId changed
                },
              }}
            >
              <Popup>
                {shop.eventName} - {shop.addressShop}
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
