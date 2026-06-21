import React from 'react';
import { View, StyleSheet, Text, Pressable } from 'react-native';
import { MapContainer, TileLayer, Marker, Tooltip, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Review, FieldSetting } from '@/types';
import { useMap } from 'react-leaflet';
import { useTheme, spacing, borderRadius } from '@/theme';

// Fix missing marker icons in leaflet web
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface ReviewsMapProps {
  reviews: Review[];
  onReviewPress: (id: string) => void;
  getAddress: (review: Review) => string;
  fieldSettings: FieldSetting[];
}

function formatFieldValue(value: unknown, type: FieldSetting['type']): string {
  if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) return '';
  switch (type) {
    case 'dollar': return `$${Number(value).toLocaleString()}`;
    case 'sqft': return `${Number(value).toLocaleString()} sqft`;
    case 'score': return `⭐ ${value}`;
    case 'boolean': return value ? '✓' : '✗';
    case 'tag': return Array.isArray(value) ? (value as string[]).join(', ') : String(value);
    default: return String(value);
  }
}

function FitBounds({ markers }: { markers: Review[] }) {
  const map = useMap();
  React.useEffect(() => {
    if (markers.length > 0) {
      const bounds = L.latLngBounds(markers.map(m => [m.lat!, m.lng!]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [markers, map]);
  return null;
}

export function ReviewsMap({ reviews, onReviewPress, getAddress, fieldSettings }: ReviewsMapProps) {
  const { colors } = useTheme();
  const markers = reviews.filter((r) => r.lat !== undefined && r.lng !== undefined);
  const center = markers.length > 0 ? [markers[0].lat!, markers[0].lng!] : [39.8283, -98.5795];

  // Visible settings excluding the core address field
  const mapVisibleSettings = fieldSettings.filter((s) => (s.isVisibleMap ?? s.isVisible ?? true) && !s.isCore);
  const listVisibleSettings = fieldSettings.filter((s) => (s.isVisibleList ?? s.isVisible ?? true) && !s.isCore).sort((a, b) => a.order - b.order);

  const renderLabel = (review: Review, settings: FieldSetting[]) => {
    return settings
      .map((s) => ({ text: formatFieldValue(review.fields[s.id], s.type), key: s.key }))
      .filter((obj) => Boolean(obj.text))
      .map((obj, i) => (
        <div key={i} className="move-tooltip-text-line">
          <span style={{ fontWeight: 400, color: '#ccc' }}>{obj.key}: </span>
          {obj.text}
        </div>
      ));
  };

  return (
    <View style={styles.container}>
      <MapContainer
        center={center as [number, number]}
        zoom={markers.length > 0 ? 13 : 4}
        style={{ width: '100%', height: '100%' }}
      >
        <FitBounds markers={markers} />
        <TileLayer
          attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {markers.map((review) => {
          return (
            <Marker
              key={review.id}
              position={[review.lat!, review.lng!]}
            >
              {renderLabel(review, mapVisibleSettings).length > 0 && (
                  <Tooltip
                    permanent
                    direction="top"
                    offset={[-15, -15]}
                    className="move-tooltip"
                  >
                  <div className="move-tooltip-text">{renderLabel(review, mapVisibleSettings)}</div>
                </Tooltip>
              )}
              <Popup>
                <div onClick={() => onReviewPress(review.id)} style={{ cursor: 'pointer' }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>{getAddress(review)}</div>
                  {listVisibleSettings.map((s) => {
                    const formatted = formatFieldValue(review.fields[s.id], s.type);
                    if (!formatted) return null;
                    return (
                      <div key={s.id} style={{ display: 'flex', marginBottom: 2 }}>
                        <span style={{ fontSize: 12, color: '#666' }}>{s.key}:&nbsp;</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#333' }}>{formatted}</span>
                      </div>
                    );
                  })}
                  <div style={{ fontSize: 10, color: colors.primary, marginTop: 4, textAlign: 'center' }}>Tap to view →</div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Inject CSS for tooltip styling */}
      {typeof document !== 'undefined' && (() => {
        const id = 'move-tooltip-style';
        if (!document.getElementById(id)) {
          const style = document.createElement('style');
          style.id = id;
          style.textContent = `
            .move-tooltip {
              background: rgba(30, 30, 45, 0.92) !important;
              border: none !important;
              border-radius: 6px !important;
              padding: 4px 8px !important;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3) !important;
              white-space: nowrap !important;
            }
            .move-tooltip::before {
              border-top-color: rgba(30, 30, 45, 0.92) !important;
            }
            .move-tooltip-text {
              color: #fff;
              font-family: system-ui, sans-serif;
              text-align: center;
            }
            .move-tooltip-text-line {
              font-size: 11px;
              font-weight: 700;
              letter-spacing: 0.1px;
              margin-bottom: 2px;
            }
            .move-tooltip-text-line:last-child {
              margin-bottom: 0;
            }
            .leaflet-tooltip-top.move-tooltip::before {
              border-top-color: rgba(30, 30, 45, 0.92) !important;
            }
          `;
          document.head.appendChild(style);
        }
        return null;
      })()}

      {markers.length === 0 && (
        <View style={[styles.emptyContainer, { backgroundColor: colors.surface }]}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No locations found. Add addresses to see them here.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, zIndex: 0 },
  emptyContainer: {
    position: 'absolute', top: 20, left: 20, right: 20,
    padding: 15,
    borderRadius: 8,
    zIndex: 1000,
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  } as any,
  emptyText: { textAlign: 'center' },
});
