import { describe, it, expect } from 'vitest';
import { applyModifiers } from '../modifiers';
import type { VariantModifier } from '../modifiers';
import type { VariantSelectionItem, ChildVariant } from '../index';

describe('Modifier Engine', () => {
    const modifiers: VariantModifier[] = [
        {
            id: "m1",
            if: {
                typeValue: "Color",
                optionValue: "Gold"
            },
            then: [
                { field: "cost", operation: "add", value: 50 }, // Gold adds 50 to cost
                { field: "sku", operation: "add", value: "-GLD" } // Gold appends -GLD to SKU
            ]
        },
        {
            id: "m2",
            if: {
                typeValue: "Size",
                optionValue: "XXL"
            },
            then: [
                { field: "cost", operation: "multiply", value: 1.2 }, // XXL increases cost by 20%
                { field: "stock", operation: "set", value: 500 } // Set stock to 500
            ]
        }
    ];

    const baseProduct: ChildVariant = {
        variantKey: "base",
        sku: "PROD",
        cost: 100,
        stock: 10,
        title: "Base Product",
        imageIds: []
    };

    it('should apply simple addition modifier', () => {
        const selection: VariantSelectionItem[] = [
            { typeValue: "Color", optionValue: "Gold", typeIndex: 0, optionIndex1Based: 1 }
        ];

        const result = applyModifiers(baseProduct, selection, modifiers);
        expect(result.cost).toBe(150); // 100 + 50
        expect(result.sku).toBe("PROD-GLD");
        expect(result.stock).toBe(10); // Unchanged
    });

    it('should apply multiplication modifier', () => {
        // Only XXL selected, not Gold
        const selection: VariantSelectionItem[] = [
            { typeValue: "Size", optionValue: "XXL", typeIndex: 1, optionIndex1Based: 1 }
        ];

        const result = applyModifiers(baseProduct, selection, modifiers);
        expect(result.cost).toBe(120); // 100 * 1.2
        expect(result.stock).toBe(500);
    });

    it('should apply multiple modifiers in order', () => {
        // Gold and XXL. 
        const selection: VariantSelectionItem[] = [
            { typeValue: "Color", optionValue: "Gold", typeIndex: 0, optionIndex1Based: 1 },
            { typeValue: "Size", optionValue: "XXL", typeIndex: 1, optionIndex1Based: 2 }
        ];

        // m1 comes first in `modifiers` list.
        // 1. m1: cost = 100 + 50 = 150.
        // 2. m2: cost = 150 * 1.2 = 180.

        const result = applyModifiers(baseProduct, selection, modifiers);
        expect(result.cost).toBe(180);
        expect(result.sku).toBe("PROD-GLD");
        expect(result.stock).toBe(500);
    });

    it('should handle missing fields gracefully (initialization)', () => {
        const partialBase: ChildVariant = {
            variantKey: "partial",
            sku: "P",
        } as ChildVariant; // cost/stock undefined

        const selection: VariantSelectionItem[] = [
            { typeValue: "Color", optionValue: "Gold", typeIndex: 0, optionIndex1Based: 1 }
        ];

        const result = applyModifiers(partialBase, selection, modifiers);
        // m1 adds 50 to cost. cost is undefined.
        // Logic: if currentVal == null, if op is set or add, set it.

        expect(result.cost).toBe(50);
    });
});
