import React from 'react';
import { View, StyleSheet, Text, Pressable } from 'react-native';
import { MapContainer, TileLayer, Marker, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Review, FieldSetting } from '@/types';
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

export function ReviewsMap({ reviews, onReviewPress, getAddress, fieldSettings }: ReviewsMapProps) {
  const { colors } = useTheme();
  const markers = reviews.filter((r) => r.lat !== undefined && r.lng !== undefined);
  const center = markers.length > 0 ? [markers[0].lat!, markers[0].lng!] : [39.8283, -98.5795];

  // Visible settings excluding the core address field
  const visibleSettings = fieldSettings.filter((s) => s.isVisible && !s.isCore);

  // Build one-liner label: e.g. "⭐ 4  $2,500  3bd"
  const buildLabel = (review: Review): string => {
    return visibleSettings
      .map((s) => formatFieldValue(review.fields[s.id], s.type))
      .filter(Boolean)
      .join('  ·  ');
  };

  return (
    <View style={styles.container}>
      <MapContainer
        center={center as [number, number]}
        zoom={markers.length > 0 ? 13 : 4}
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {markers.map((review) => {
          const label = buildLabel(review);
          return (
            <Marker
              key={review.id}
              position={[review.lat!, review.lng!]}
              eventHandlers={{
                click: () => onReviewPress(review.id),
              }}
            >
              {label && (
                <Tooltip
                  permanent
                  direction="top"
                  offset={[0, -28]}
                  className="move-tooltip"
                >
                  <span className="move-tooltip-text">{label}</span>
                </Tooltip>
              )}
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
              font-size: 11px;
              font-weight: 700;
              font-family: system-ui, sans-serif;
              letter-spacing: 0.1px;
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
