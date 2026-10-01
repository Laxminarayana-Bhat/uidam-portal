/********************************************************************************
* Copyright (c) 2025 Harman International
*
* <p>Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
* <p>http://www.apache.org/licenses/LICENSE-2.0
*
* <p> Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*
* <p>SPDX-License-Identifier: Apache-2.0
********************************************************************************/

export interface AttributeTypeOption {
  /** Canonical raw DB type value sent to the backend for this category. */
  value: string;
  /** Business-friendly label shown in the UI. */
  label: string;
}

// Simplified type categories shown to business users in the Add/Edit Attribute dropdown.
export const ATTRIBUTE_TYPE_OPTIONS: AttributeTypeOption[] = [
  { value: 'varchar', label: 'Text' },
  { value: 'numeric', label: 'Number' },
  { value: 'bool', label: 'Boolean' },
  { value: 'date', label: 'Date' },
  { value: 'timestamp', label: 'Date & Time' },
  { value: 'json', label: 'JSON' },
  { value: '_text', label: 'List' },
];

const DEFAULT_OPTION_VALUE = ATTRIBUTE_TYPE_OPTIONS[0].value;

// Maps raw backend DB column types to one of the ATTRIBUTE_TYPE_OPTIONS values above.
// Decimal/Time/UUID/Binary raw types are folded into the nearest business category
// (Number, Date & Time, Text, Text respectively) since those aren't separate dropdown options.
// File (bytea) is intentionally unsupported and excluded from the dropdown entirely.
const RAW_TYPE_TO_OPTION_VALUE: Record<string, string> = {
  varchar: 'varchar', char: 'varchar', bpchar: 'varchar', name: 'varchar', text: 'varchar', uuid: 'varchar', bytea: 'varchar',
  bool: 'bool', bit: 'bool',
  int2: 'numeric', int4: 'numeric', int8: 'numeric', serial: 'numeric', bigserial: 'numeric', oid: 'numeric',
  float4: 'numeric', float8: 'numeric', numeric: 'numeric', money: 'numeric',
  date: 'date',
  time: 'timestamp', timetz: 'timestamp', timestamp: 'timestamp',
  json: 'json', jsonb: 'json',
};

/**
 * Maps a raw backend DB type (e.g. "varchar", "int8", "_numeric") to the matching
 * ATTRIBUTE_TYPE_OPTIONS value, so an existing attribute's type can be pre-selected
 * in the simplified dropdown.
 * @param {string | null} [rawType] - The raw DB type stored on the attribute definition
 * @returns {string} The matching option value, defaulting to "Text" when unrecognized
 */
export const getAttributeTypeOptionValue = (rawType?: string | null): string => {
  if (!rawType) return DEFAULT_OPTION_VALUE;
  if (rawType.startsWith('_')) return '_text';
  return RAW_TYPE_TO_OPTION_VALUE[rawType.toLowerCase()] ?? DEFAULT_OPTION_VALUE;
};

/**
 * Resolves the business-friendly label for a raw backend DB type.
 * @param {string | null} [rawType] - The raw DB type stored on the attribute definition
 * @returns {string} The matching business-friendly label (e.g. "Number" for "int8")
 */
export const getAttributeTypeLabel = (rawType?: string | null): string => {
  const optionValue = getAttributeTypeOptionValue(rawType);
  return ATTRIBUTE_TYPE_OPTIONS.find((opt) => opt.value === optionValue)?.label ?? rawType ?? '-';
};
