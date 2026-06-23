import { describe, it, expect } from '@jest/globals';
import { migrateFieldSettings, migrateReviews, CURRENT_SCHEMA_VERSION } from '../migrations';
import { FieldSetting, Review } from '@/types';

describe('Data Migrations', () => {
  describe('FieldSettings v0 -> v1', () => {
    it('migrates isVisible to isVisibleList and isVisibleMap', () => {
      const oldSettings: any[] = [
        {
          id: '1',
          key: 'Test',
          type: 'text',
          isVisible: false,
        },
        {
          id: '2',
          key: 'Test 2',
          type: 'text',
        }
      ];

      const migrated = migrateFieldSettings(oldSettings as FieldSetting[]);

      expect(migrated[0].isVisibleList).toBe(false);
      expect(migrated[0].isVisibleMap).toBe(false);
      expect(migrated[0].schemaVersion).toBe(CURRENT_SCHEMA_VERSION);

      // Default fallback is true if isVisible is completely undefined
      expect(migrated[1].isVisibleList).toBe(true);
      expect(migrated[1].isVisibleMap).toBe(true);
    });

    it('upgrades legacy address types to address', () => {
      const oldSettings: any[] = [
        { id: 'default-address', key: 'Address', type: 'single-line' },
        { id: 'custom', key: 'address', type: 'label' },
        { id: 'custom2', key: 'ADDRESS', type: 'text' },
        { id: 'other', key: 'Notes', type: 'single-line' }
      ];

      const migrated = migrateFieldSettings(oldSettings as FieldSetting[]);

      expect(migrated[0].type).toBe('address');
      expect(migrated[1].type).toBe('address');
      expect(migrated[2].type).toBe('address');
      expect(migrated[3].type).toBe('single-line'); // untocuhed because it's not named address
      
      // Addresses should be forced to not be sortable or filterable
      expect(migrated[0].isFilterable).toBe(false);
      expect(migrated[0].isSortable).toBe(false);
    });
  });

  describe('Reviews v0 -> v1', () => {
    it('stamps current schema version on unversioned reviews', () => {
      const oldReviews: any[] = [
        { id: 'r1', fields: {} }
      ];

      const migrated = migrateReviews(oldReviews as Review[]);

      expect(migrated[0].schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    });
  });
});
