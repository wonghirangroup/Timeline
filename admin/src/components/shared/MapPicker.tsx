// MapPicker — raw Leaflet API, Google Maps tiles, Thailand bounds, geolocation
import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'

const THAILAND_CENTER: [number, number] = [13.0, 101.0]
const THAILAND_BOUNDS = L.latLngBounds(
  L.latLng(5.5, 97.3),   // SW corner
  L.latLng(20.6, 105.7), // NE corner
)

const PIN_ICON = L.divIcon({
  className: '',
  html: `<div style="width:28px;height:28px;background:linear-gradient(135deg,#f97316,#ea580c);border:3px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
})

interface Props {
  lat: number
  lng: number
  radius: number
  onMove: (lat: number, lng: number) => void
}

export default function MapPicker({ lat, lng, radius, onMove }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const circleRef = useRef<L.Circle | null>(null)
  const [locating, setLocating] = useState(false)
  const [locError, setLocError] = useState<string | null>(null)

  const hasPin = lat !== 0 || lng !== 0

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const center: [number, number] = hasPin ? [lat, lng] : THAILAND_CENTER
    const zoom = hasPin ? 16 : 6

    const map = L.map(containerRef.current, {
      center,
      zoom,
      maxBounds: THAILAND_BOUNDS,
      maxBoundsViscosity: 0.9,
      minZoom: 5,
    })
    mapRef.current = map

    L.tileLayer('https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      subdomains: ['0', '1', '2', '3'],
      attribution: 'Map data &copy; Google',
      maxZoom: 21,
    }).addTo(map)

    map.on('click', (e: L.LeafletMouseEvent) => {
      onMove(e.latlng.lat, e.latlng.lng)
    })

    return () => {
      map.remove()
      mapRef.current = null
      markerRef.current = null
      circleRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync marker + circle when lat/lng/radius change
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (!hasPin) {
      markerRef.current?.remove()
      circleRef.current?.remove()
      markerRef.current = null
      circleRef.current = null
      return
    }

    const pos: [number, number] = [lat, lng]

    if (!markerRef.current) {
      markerRef.current = L.marker(pos, { icon: PIN_ICON, draggable: true }).addTo(map)
      markerRef.current.on('dragend', () => {
        const p = markerRef.current?.getLatLng()
        if (p) onMove(p.lat, p.lng)
      })
    } else {
      markerRef.current.setLatLng(pos)
    }

    if (!circleRef.current) {
      circleRef.current = L.circle(pos, {
        radius,
        color: '#f97316',
        fillColor: '#f97316',
        fillOpacity: 0.12,
        weight: 2,
      }).addTo(map)
    } else {
      circleRef.current.setLatLng(pos)
      circleRef.current.setRadius(radius)
    }

    map.setView(pos, map.getZoom() < 14 ? 16 : map.getZoom())
  }, [lat, lng, radius, hasPin]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleLocate = () => {
    if (!navigator.geolocation) {
      setLocError('เบราว์เซอร์ไม่รองรับ GPS')
      return
    }
    setLocating(true)
    setLocError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false)
        const { latitude, longitude } = pos.coords
        // clamp to Thailand bounds just in case
        const clamped = THAILAND_BOUNDS.contains([latitude, longitude])
          ? { lat: latitude, lng: longitude }
          : THAILAND_BOUNDS.getCenter()
        onMove(clamped.lat, clamped.lng)
        mapRef.current?.setView([clamped.lat, clamped.lng], 17)
      },
      (err) => {
        setLocating(false)
        setLocError(err.code === 1 ? 'ไม่ได้รับอนุญาตให้เข้าถึง GPS' : 'ไม่พบตำแหน่ง')
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  return (
    <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid #e5e7eb' }}>
      {/* Locate button overlay */}
      <div style={{ position: 'relative' }}>
        <div ref={containerRef} style={{ height: 320, width: '100%' }} />
        <button
          type="button"
          onClick={handleLocate}
          disabled={locating}
          style={{
            position: 'absolute', top: 10, right: 10, zIndex: 1000,
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 12px', borderRadius: 8,
            background: '#fff', border: '1px solid #e5e7eb',
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            cursor: locating ? 'not-allowed' : 'pointer',
            fontSize: '12px', fontWeight: 600, color: '#374151',
            opacity: locating ? 0.7 : 1,
          }}
        >
          {locating ? (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth={2.5}
              style={{ animation: 'spin 1s linear infinite' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
            </svg>
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth={2.5}>
              <circle cx="12" cy="12" r="3" />
              <path strokeLinecap="round" d="M12 2v3m0 14v3M2 12h3m14 0h3" />
              <circle cx="12" cy="12" r="8" strokeDasharray="4 2" />
            </svg>
          )}
          {locating ? 'กำลังหาตำแหน่ง…' : 'ตำแหน่งปัจจุบัน'}
        </button>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>

      {/* Status bar */}
      <div style={{
        padding: '8px 12px', background: '#f8fafc',
        borderTop: '1px solid #e5e7eb',
        display: 'flex', alignItems: 'center', gap: 6, minHeight: 36,
      }}>
        <svg width="12" height="12" fill="none" stroke="#f97316" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>

        {locError ? (
          <span style={{ fontSize: '11px', color: '#ef4444' }}>{locError}</span>
        ) : hasPin ? (
          <span style={{ fontSize: '11px', color: '#374151', fontFamily: 'monospace' }}>
            {lat.toFixed(6)}, {lng.toFixed(6)}
          </span>
        ) : (
          <span style={{ fontSize: '11px', color: '#9ca3af' }}>แตะบนแผนที่หรือกด "ตำแหน่งปัจจุบัน" เพื่อปักหมุด</span>
        )}

        {hasPin && (
          <button
            type="button"
            onClick={() => { onMove(0, 0); setLocError(null) }}
            style={{
              marginLeft: 'auto', fontSize: '11px', color: '#ef4444',
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '2px 6px', borderRadius: 4,
            }}
          >ล้าง</button>
        )}
      </div>
    </div>
  )
}
