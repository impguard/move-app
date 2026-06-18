export type FieldType =
  | 'tag'
  | 'dollar'
  | 'score'
  | 'boolean'
  | 'number'
  | 'text'
  | 'single-line'
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
  isVisible?: boolean;
}

export interface Review {
  id: string;
  createdAt: string;
  updatedAt: string;
  fields: Record<string, unknown>;
  hasDuplicate?: boolean;
  lat?: number;
  lng?: number;
  status?: 'draft' | 'saved';
}

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  'tag': 'Tag',
  'dollar': 'Dollar Amount',
  'score': 'Score',
  'boolean': 'Yes / No',
  'number': 'Number',
  'text': 'Multi-line Text',
  'single-line': 'Single Line',
  'link': 'Link',
  'pictures': 'Pictures',
  'sqft': 'Square Footage',
};

export function getDefaultValue(type: FieldType): unknown {
  switch (type) {
    case 'tag':
      return [];
    case 'single-line':
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
      return false;
    case 'pictures':
      return [];
    default:
      return '';
  }
}
