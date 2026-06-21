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
  | 'sqft';

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
  status?: 'draft' | 'saved';
}

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  'label': 'Single-Tag',
  'address': 'Address',
  'tag': 'Multi-Tag',
  'number': 'Number',
  'dollar': 'Dollar Amount',
  'sqft': 'Square Footage',
  'score': 'Score',
  'boolean': 'Yes / No / Unknown',
  'text': 'Multi-line Text',
  'link': 'Link',
  'pictures': 'Pictures',
};

export function getDefaultValue(type: FieldType): unknown {
  switch (type) {
    case 'tag':
      return [];
    case 'label':
    case 'address':
    case 'text':
    case 'link':
      return '';
    case 'dollar':
    case 'number':
    case 'sqft':
      return 0;
    case 'score':
      return 1;
    case 'boolean':
      return null;
    case 'pictures':
      return [];
    default:
      return '';
  }
}
