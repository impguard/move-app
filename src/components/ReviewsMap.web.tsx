import React from 'react';
import { View, StyleSheet, Text, Pressable } from 'react-native';
import { MapContainer, TileLayer, Marker, Popup, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Review, FieldSetting } from '@/types';
import { colors, typography, spacing, borderRadius } from '@/theme';

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
    case 'boolean': return value ? '✓ Yes' : '✗ No';
    case 'tag': return Array.isArray(value) ? (value as string[]).join(', ') : String(value);
    default: return String(value);
  }
}

export function ReviewsMap({ reviews, onReviewPress, getAddress, fieldSettings }: ReviewsMapProps) {
  const markers = reviews.filter((r) => r.lat !== undefined && r.lng !== undefined);
  const center = markers.length > 0 ? [markers[0].lat!, markers[0].lng!] : [39.8283, -98.5795];

  // Visible settings excluding the core address field
  const visibleSettings = fieldSettings.filter((s) => s.isVisible && !s.isCore);

  return (
    <View style={styles.container}>
      <MapContainer center={center as [number, number]} zoom={markers.length > 0 ? 13 : 4} style={{ width: '100%', height: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {markers.map((review) => (
          <Marker key={review.id} position={[review.lat!, review.lng!]}>
            {visibleSettings.length > 0 && (
              <Tooltip permanent direction="bottom" offset={[0, 10]} className="custom-tooltip">
                <View style={styles.tooltipContent}>
                  {visibleSettings.map((s) => {
                    const formatted = formatFieldValue(review.fields[s.id], s.type);
                    if (!formatted) return null;
                    return (
                      <Text key={s.id} style={styles.tooltipText}>
                        {formatted}
                      </Text>
                    );
                  })}
                </View>
              </Tooltip>
            )}
            <Popup minWidth={180} maxWidth={260}>
              <Pressable onPress={() => onReviewPress(review.id)} style={styles.popupPressable}>
                <Text style={styles.calloutTitle} numberOfLines={2}>
                  {getAddress(review)}
                </Text>
                {visibleSettings.length > 0 && (
                  <View style={styles.fields}>
                    {visibleSettings.map((s) => {
                      const formatted = formatFieldValue(review.fields[s.id], s.type);
                      if (!formatted) return null;
                      return (
                        <View key={s.id} style={styles.fieldRow}>
                          <Text style={styles.fieldKey}>{s.key}</Text>
                          <Text style={styles.fieldVal}>{formatted}</Text>
                        </View>
                      );
                    })}
                  </View>
                )}
                <Text style={styles.calloutTap}>Tap to view →</Text>
              </Pressable>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      {markers.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No locations found. Add addresses to see them here.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, zIndex: 0 },
  popupPressable: { paddingVertical: 4 },
  calloutTitle: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  fields: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: 8,
    marginBottom: 8,
    gap: 4,
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  fieldKey: {
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
  },
  fieldVal: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '600',
    textAlign: 'right',
  },
  calloutTap: { fontSize: 11, color: colors.primary, marginTop: 4 },
  emptyContainer: {
    position: 'absolute', top: 20, left: 20, right: 20,
    backgroundColor: 'white', padding: 15,
    borderRadius: 8, zIndex: 1000,
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  emptyText: { textAlign: 'center', color: colors.textSecondary },
  tooltipContent: {
    alignItems: 'center',
    gap: 2,
  },
  tooltipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  }
});
