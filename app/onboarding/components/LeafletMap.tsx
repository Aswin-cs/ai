"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

interface LeafletMapProps {
  lat: number;
  lng: number;
  stationName: string;
  pm25: string;
  onLocationChange?: (lat: number, lng: number) => void;
}

function createSensorIcon(L: any, name: string) {
  return L.divIcon({
    className: "leaflet-custom-sensor-icon",
    html: `
      <div style="display:flex; flex-direction:column; align-items:center; transform: translate(-50%, -50%);">
        <div style="position:relative; display:flex; align-items:center; justify-content:center; width:36px; height:36px;">
          <span style="position:absolute; width:44px; height:44px; border-radius:9999px; background-color:rgba(11,87,208,0.25); animation:ping 2s cubic-bezier(0,0,0.2,1) infinite;"></span>
          <span style="position:absolute; width:28px; height:28px; border-radius:9999px; background-color:rgba(11,87,208,0.35);"></span>
          <div style="width:34px; height:34px; border-radius:9999px; background-color:#0B57D0; color:white; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 12px rgba(0,0,0,0.2); border:2.5px solid #ffffff; z-index:10;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/>
              <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/>
              <circle cx="12" cy="12" r="2"/>
              <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/>
              <path d="M19.1 4.9C23 8.8 23 15.1 19.1 19"/>
            </svg>
          </div>
        </div>
        <div style="margin-top:6px; background:rgba(255,255,255,0.96); backdrop-filter:blur(6px); padding:3px 10px; border-radius:9999px; box-shadow:0 2px 8px rgba(0,0,0,0.15); border:1px solid #D3E3FD; font-size:11px; font-weight:600; color:#1F1F1F; display:flex; align-items:center; gap:5px; white-space:nowrap; max-width:280px;">
          <span style="width:7px; height:7px; border-radius:9999px; background-color:#137333; flex-shrink:0;"></span>
          <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${name}</span>
        </div>
      </div>
    `,
    iconSize: [0, 0],
  });
}

export default function LeafletMap({
  lat,
  lng,
  stationName,
  pm25,
  onLocationChange,
}: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const leafletModuleRef = useRef<any>(null);

  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (!containerRef.current) return;

      const L = (await import("leaflet")).default;
      leafletModuleRef.current = L;

      if (!isMounted) return;

      // Clean up existing map if any
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      // Initialize map
      const map = L.map(containerRef.current, {
        center: [lat, lng],
        zoom: 14,
        zoomControl: false,
        attributionControl: false,
      });

      // Add OpenStreetMap tile layer
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      // Add small custom zoom control on top right
      L.control.zoom({ position: "topright" }).addTo(map);

      // Add custom OpenStreetMap attribution on bottom left
      L.control
        .attribution({ position: "bottomleft", prefix: false })
        .addAttribution('&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>')
        .addTo(map);

      const sensorIcon = createSensorIcon(L, stationName);

      const marker = L.marker([lat, lng], {
        icon: sensorIcon,
        draggable: true,
      }).addTo(map);

      marker.bindPopup(`
        <div style="font-family:sans-serif; padding:4px 2px;">
          <strong style="color:#0B57D0; font-size:13px; display:block; margin-bottom:2px;">${stationName}</strong>
          <span style="font-size:12px; color:#444746;">Live Ground Telemetry: <strong>${pm25}</strong></span>
        </div>
      `);

      marker.on("dragend", () => {
        const position = marker.getLatLng();
        if (onLocationChange) {
          onLocationChange(position.lat, position.lng);
        }
      });

      map.on("click", (e: any) => {
        marker.setLatLng(e.latlng);
        if (onLocationChange) {
          onLocationChange(e.latlng.lat, e.latlng.lng);
        }
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Smoothly pan and update marker icon and popup when coordinates or stationName change
  useEffect(() => {
    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.flyTo([lat, lng], 14, { duration: 1.2 });
      markerRef.current.setLatLng([lat, lng]);

      if (leafletModuleRef.current) {
        markerRef.current.setIcon(createSensorIcon(leafletModuleRef.current, stationName));
      }

      markerRef.current.setPopupContent(`
        <div style="font-family:sans-serif; padding:4px 2px;">
          <strong style="color:#0B57D0; font-size:13px; display:block; margin-bottom:2px;">${stationName}</strong>
          <span style="font-size:12px; color:#444746;">Live Ground Telemetry: <strong>${pm25}</strong></span>
        </div>
      `);
    }
  }, [lat, lng, stationName, pm25]);

  return (
    <div className="relative w-full h-[220px] rounded-2xl border border-[#E0E3E1] overflow-hidden bg-[#E9EEF6] shadow-inner z-0">
      <div ref={containerRef} className="w-full h-full z-0" />
    </div>
  );
}
