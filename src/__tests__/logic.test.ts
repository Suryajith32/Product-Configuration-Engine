import { describe, it, expect } from 'vitest';
import { isConditionMet } from '../constraints';
import type { LogicCondition } from '../constraints';
import type { VariantSelectionItem } from '../index';

describe('Logic++ Engine', () => {
    // Helper to create mock selection
    const selection = (items: Record<string, string>): VariantSelectionItem[] =>
        Object.entries(items).map(([type, val], i) => ({
            typeValue: type,
            optionValue: val,
            typeIndex: i, // Mock
            optionIndex1Based: 1 // Mock
        }));

    it('should handle simple conditions (Leaf)', () => {
        const s = selection({ Color: 'Red' });
        const c: LogicCondition = { typeValue: 'Color', optionValue: 'Red' };
        expect(isConditionMet(s, c)).toBe(true);

        const c2: LogicCondition = { typeValue: 'Color', optionValue: 'Blue' };
        expect(isConditionMet(s, c2)).toBe(false);
    });

    it('should handle AND logic', () => {
        const s = selection({ Color: 'Red', Size: 'XL' });
        const c: LogicCondition = {
            operator: 'AND',
            conditions: [
                { typeValue: 'Color', optionValue: 'Red' },
                { typeValue: 'Size', optionValue: 'XL' }
            ]
        };
        expect(isConditionMet(s, c)).toBe(true);

        const s2 = selection({ Color: 'Red', Size: 'M' });
        expect(isConditionMet(s2, c)).toBe(false); // Size mismatch
    });

    it('should handle OR logic', () => {
        const c: LogicCondition = {
            operator: 'OR',
            conditions: [
                { typeValue: 'Color', optionValue: 'Red' },
                { typeValue: 'Color', optionValue: 'Blue' }
            ]
        };

        expect(isConditionMet(selection({ Color: 'Red' }), c)).toBe(true);
        expect(isConditionMet(selection({ Color: 'Blue' }), c)).toBe(true);
        expect(isConditionMet(selection({ Color: 'Green' }), c)).toBe(false);
    });

    it('should handle nested logic (AND inside OR)', () => {
        // (Color=Red AND Size=XL) OR (Material=Silk)
        const c: LogicCondition = {
            operator: 'OR',
            conditions: [
                {
                    operator: 'AND',
                    conditions: [
                        { typeValue: 'Color', optionValue: 'Red' },
                        { typeValue: 'Size', optionValue: 'XL' }
                    ]
                },
                { typeValue: 'Material', optionValue: 'Silk' }
            ]
        };

        expect(isConditionMet(selection({ Color: 'Red', Size: 'XL' }), c)).toBe(true); // First branch
        expect(isConditionMet(selection({ Material: 'Silk', Size: 'S' }), c)).toBe(true); // Second branch
        expect(isConditionMet(selection({ Color: 'Red', Size: 'S' }), c)).toBe(false); // Neither
    });

    it('should inferred IN operator for arrays (Backwards Compatibility)', () => {
        // Logic++ upgrade implies if operator is missing and value is array -> IN
        const s = selection({ Size: 'M' });
        const c: LogicCondition = {
            typeValue: 'Size',
            optionValue: ['S', 'M', 'L']
            // operator undefined
        };
        expect(isConditionMet(s, c)).toBe(true);
    });
});
