export type FieldType =
  | 'tag'
  | 'dollar'
  | 'score'
  | 'boolean'
  | 'number'
  | 'text'
  | 'label'
  | 'single-line'  // legacy alias — treat same as label
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
  'tag': 'Tag (multi-value)',
  'label': 'Label (single-value)',
  'dollar': 'Dollar Amount',
  'score': 'Score',
  'boolean': 'Yes / No',
  'number': 'Number',
  'text': 'Multi-line Text',
  'single-line': 'Label (single-value)',  // legacy
  'link': 'Link',
  'pictures': 'Pictures',
  'sqft': 'Square Footage',
};

export function getDefaultValue(type: FieldType): unknown {
  switch (type) {
    case 'tag':
      return [];
    case 'label':
    case 'single-line':  // legacy
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
