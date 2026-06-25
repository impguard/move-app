export type FieldType =
  | 'tag'
  | 'dollar'
  | 'score'
  | 'boolean'
  | 'number'
  | 'text'
  | 'label'
  | 'address'
  | 'link'
  | 'pictures'
  | 'sqft'
  | 'strict_boolean'
  | 'beds_baths'
  | 'date';

export interface FieldSetting {
  id: string;
  key: string;
  type: FieldType;
  isCore: boolean;
  isDefault: boolean;
  order: number;
  scoreMin?: number;
  scoreMax?: number;
  isVisible?: boolean; // Deprecated: Use isVisibleList instead
  isVisibleList?: boolean;
  isVisibleMap?: boolean;
  isSortable?: boolean;
  isFilterable?: boolean;
  schemaVersion?: number;
}

export interface Review {
  id: string;
  createdAt: string;
  updatedAt: string;
  version?: number;
  fields: Record<string, unknown>;
  hasDuplicate?: boolean;
  lat?: number;
  lng?: number;
  status?: 'draft' | 'saved' | 'taken' | 'hidden';
  schemaVersion?: number;
}

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  'label': 'Single-Tag',
  'address': 'Address',
  'tag': 'Multi-Tag',
  'number': 'Number',
  'dollar': 'Dollar Amount',
  'sqft': 'Square Footage',
  'score': 'Score',
  'boolean': 'Yes / No / Unknown (Toggle)',
  'strict_boolean': 'Yes / No (Toggle)',
  'text': 'Multi-line Text',
  'link': 'Link',
  'pictures': 'Pictures',
  'beds_baths': 'Beds / Baths',
  'date': 'Date',
};

export function getDefaultValue(type: FieldType): unknown {
  switch (type) {
    case 'tag':
      return [];
    case 'label':
    case 'address':
    case 'text':
    case 'link':
    case 'date':
      return '';
    case 'dollar':
    case 'number':
    case 'sqft':
      return 0;
    case 'score':
      return 1;
    case 'boolean':
      return null;
    case 'strict_boolean':
      return false;
    case 'pictures':
      return [];
    case 'beds_baths':
      return { beds: null, baths: null };
    default:
      return '';
  }
}
