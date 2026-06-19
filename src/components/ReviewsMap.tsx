import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import MapView, { Marker, Callout, UrlTile } from 'react-native-maps';
import { Review, FieldSetting } from '@/types';
import { colors, typography, spacing } from '@/theme';

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
  const mapRef = useRef<MapView>(null);

  const markers = reviews.filter((r) => r.lat !== undefined && r.lng !== undefined);
  const visibleSettings = fieldSettings.filter((s) => s.isVisible && !s.isCore);

  useEffect(() => {
    if (markers.length > 0 && mapRef.current) {
      const coordinates = markers.map((r) => ({ latitude: r.lat!, longitude: r.lng! }));
      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }
  }, [markers]);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={
          markers.length > 0
            ? {
                latitude: markers[0].lat!,
                longitude: markers[0].lng!,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }
            : undefined
        }
      >
        <UrlTile urlTemplate="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maximumZ={19} />
        {markers.map((review) => (
          <Marker
            key={review.id}
            coordinate={{ latitude: review.lat!, longitude: review.lng! }}
            centerOffset={{ x: 0, y: -10 }}
          >
            <View style={styles.customMarkerContainer}>
              <View style={styles.markerDot} />
              {visibleSettings.length > 0 && (
                <View style={styles.markerLabel}>
                  {visibleSettings.map((s) => {
                    const formatted = formatFieldValue(review.fields[s.id], s.type);
                    if (!formatted) return null;
                    return (
                      <Text key={s.id} style={styles.markerLabelText} numberOfLines={1}>
                        {formatted}
                      </Text>
                    );
                  })}
                </View>
              )}
            </View>
            <Callout onPress={() => onReviewPress(review.id)}>
              <View style={styles.callout}>
                <Text style={styles.calloutTitle} numberOfLines={2}>
                  {getAddress(review)}
                </Text>
                {visibleSettings.map((s) => {
                  const formatted = formatFieldValue(review.fields[s.id], s.type);
                  if (!formatted) return null;
                  return (
                    <View key={s.id} style={styles.fieldRow}>
                      <Text style={styles.fieldKey}>{s.key}: </Text>
                      <Text style={styles.fieldVal}>{formatted}</Text>
                    </View>
                  );
                })}
                <Text style={styles.calloutTap}>Tap to view →</Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>
      {markers.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No locations found. Add addresses to see them here.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { width: '100%', height: '100%' },
  callout: { padding: spacing.sm, minWidth: 160, maxWidth: 240 },
  calloutTitle: { ...typography.bodyMedium, fontWeight: '700', marginBottom: 6 },
  fieldRow: { flexDirection: 'row', marginBottom: 2 },
  fieldKey: { fontSize: 12, color: '#666' },
  fieldVal: { fontSize: 12, fontWeight: '600', color: '#333' },
  calloutTap: { fontSize: 10, color: colors.primary, marginTop: 4, textAlign: 'center' },
  emptyContainer: {
    position: 'absolute', top: 20, left: 20, right: 20,
    backgroundColor: 'white', padding: 15,
    borderRadius: 8, elevation: 4,
  },
  emptyText: { textAlign: 'center', color: '#666' },
  customMarkerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: 'white',
    boxShadow: '0px 2px 2px rgba(0, 0, 0, 0.3)',
    elevation: 4,
  },
  markerLabel: {
    marginTop: 2,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ccc',
    alignItems: 'center',
  },
  markerLabelText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#333',
  }
});
