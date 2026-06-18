import { v4 as uuidv4 } from 'uuid';
import { FieldSetting } from '@/types';

export function createDefaultFieldSettings(): FieldSetting[] {
  return [
    {
      id: uuidv4(),
      key: 'Address',
      type: 'single-line',
      isCore: true,
      isDefault: true,
      order: 0,
      isVisible: true,
    },
    {
      id: uuidv4(),
      key: 'Rating',
      type: 'score',
      isCore: false,
      isDefault: true,
      order: 1,
      scoreMin: 1,
      scoreMax: 5,
      isVisible: true,
    },
    {
      id: uuidv4(),
      key: 'Price',
      type: 'dollar',
      isCore: false,
      isDefault: true,
      order: 2,
      isVisible: true,
    },
    {
      id: uuidv4(),
      key: 'Square Footage',
      type: 'sqft',
      isCore: false,
      isDefault: true,
      order: 3,
      isVisible: true,
    },
    {
      id: uuidv4(),
      key: 'Bedrooms',
      type: 'number',
      isCore: false,
      isDefault: true,
      order: 4,
      isVisible: true,
    },
    {
      id: uuidv4(),
      key: 'Bathrooms',
      type: 'number',
      isCore: false,
      isDefault: true,
      order: 5,
      isVisible: true,
    },
    {
      id: uuidv4(),
      key: 'Link',
      type: 'link',
      isCore: false,
      isDefault: true,
      order: 6,
    },
    {
      id: uuidv4(),
      key: 'Pictures',
      type: 'pictures',
      isCore: false,
      isDefault: true,
      order: 7,
    },
  ];
}
