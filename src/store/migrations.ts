import { FieldSetting, Review } from '@/types';

export const CURRENT_SCHEMA_VERSION = 1;

export function migrateFieldSettings(settings: FieldSetting[]): FieldSetting[] {
  return settings.map((s) => {
    const version = s.schemaVersion || 0;
    let migrated = { ...s };

    if (version < 1) {
      // v0 -> v1 Migrations
      
      // 1. Fallback for isVisibleList and isVisibleMap
      if (migrated.isVisibleList === undefined) {
        migrated.isVisibleList = migrated.isVisible ?? true;
      }
      if (migrated.isVisibleMap === undefined) {
        migrated.isVisibleMap = migrated.isVisible ?? true;
      }
      
      // 2. Fix legacy address types ('label', 'single-line', 'text')
      if ((migrated.id === 'default-address' || migrated.key.toLowerCase() === 'address')) {
        if (migrated.type !== 'address') {
          migrated.type = 'address';
        }
        migrated.isFilterable = false;
        migrated.isSortable = false;
      }
    }

    // Stamp current version
    migrated.schemaVersion = CURRENT_SCHEMA_VERSION;
    return migrated;
  });
}

export function migrateReviews(reviews: Review[]): Review[] {
  return reviews.map((r) => {
    const version = r.schemaVersion || 0;
    let migrated = { ...r };

    if (version < 1) {
      // Future v0 -> v1 migrations for reviews would go here
    }

    // Stamp current version
    migrated.schemaVersion = CURRENT_SCHEMA_VERSION;
    return migrated;
  });
}
