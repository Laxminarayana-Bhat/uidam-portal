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
import { ATTRIBUTE_TYPE_OPTIONS, getAttributeTypeOptionValue, getAttributeTypeLabel } from './attributeTypeUtils';

describe('attributeTypeUtils', () => {
  it('exposes the 7 business-friendly type options and excludes File', () => {
    expect(ATTRIBUTE_TYPE_OPTIONS.map((o) => o.label)).toEqual([
      'Text', 'Number', 'Boolean', 'Date', 'Date & Time', 'JSON', 'List',
    ]);
  });

  describe('getAttributeTypeOptionValue', () => {
    it('maps string-like raw types to varchar', () => {
      expect(getAttributeTypeOptionValue('varchar')).toBe('varchar');
      expect(getAttributeTypeOptionValue('text')).toBe('varchar');
      expect(getAttributeTypeOptionValue('uuid')).toBe('varchar');
    });

    it('maps numeric and decimal raw types to numeric', () => {
      expect(getAttributeTypeOptionValue('int8')).toBe('numeric');
      expect(getAttributeTypeOptionValue('numeric')).toBe('numeric');
    });

    it('folds bytea (File) into varchar since File is not a supported option', () => {
      expect(getAttributeTypeOptionValue('bytea')).toBe('varchar');
    });

    it('maps boolean raw types to bool', () => {
      expect(getAttributeTypeOptionValue('bool')).toBe('bool');
      expect(getAttributeTypeOptionValue('bit')).toBe('bool');
    });

    it('maps date/time raw types', () => {
      expect(getAttributeTypeOptionValue('date')).toBe('date');
      expect(getAttributeTypeOptionValue('timestamp')).toBe('timestamp');
      expect(getAttributeTypeOptionValue('time')).toBe('timestamp');
    });

    it('maps array-prefixed raw types to list', () => {
      expect(getAttributeTypeOptionValue('_int4')).toBe('_text');
    });

    it('falls back to varchar for unknown or missing types', () => {
      expect(getAttributeTypeOptionValue('unknown_type')).toBe('varchar');
      expect(getAttributeTypeOptionValue(undefined)).toBe('varchar');
      expect(getAttributeTypeOptionValue(null)).toBe('varchar');
    });
  });

  describe('getAttributeTypeLabel', () => {
    it('returns the business-friendly label for a raw type', () => {
      expect(getAttributeTypeLabel('int8')).toBe('Number');
      expect(getAttributeTypeLabel('bytea')).toBe('Text');
      expect(getAttributeTypeLabel('_int4')).toBe('List');
    });
  });
});
