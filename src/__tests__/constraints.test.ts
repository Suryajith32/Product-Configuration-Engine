import { describe, it, expect } from 'vitest';
import { validateSelection, getAvailableOptions, VariantConstraint } from '../constraints';
import { VariantSelectionItem, VariantType } from '../index';

describe('Constraint Engine', () => {
    const constraints: VariantConstraint[] = [
        {
            id: "c1",
            if: {
                typeValue: "Color",
                optionValue: "Red"
            },
            then: {
                typeValue: "Size",
                action: "allow",
                options: ["Large", "X-Large"] // Only L and XL allowed if Red
            }
        },
        {
            id: "c2",
            if: {
                typeValue: "Material",
                optionValue: "Leather"
            },
            then: {
                typeValue: "Color",
                action: "disallow",
                options: ["Blue"] // Leather cannot be Blue
            }
        }
    ];

    describe('validateSelection', () => {
        it('should validate a valid selection', () => {
            const selection: VariantSelectionItem[] = [
                { typeValue: "Color", optionValue: "Red", typeIndex: 0, optionIndex1Based: 1 },
                { typeValue: "Size", optionValue: "Large", typeIndex: 1, optionIndex1Based: 2 }
            ];
            const result = validateSelection(selection, constraints);
            expect(result.valid).toBe(true);
            expect(result.blockedBy).toHaveLength(0);
        });

        it('should return invalid when constraints are violated (allow rule)', () => {
            const selection: VariantSelectionItem[] = [
                { typeValue: "Color", optionValue: "Red", typeIndex: 0, optionIndex1Based: 1 },
                { typeValue: "Size", optionValue: "Small", typeIndex: 1, optionIndex1Based: 1 } // Small is not in [Large, X-Large]
            ];
            const result = validateSelection(selection, constraints);
            expect(result.valid).toBe(false);
            expect(result.blockedBy).toContain("c1");
        });

        it('should return invalid when constraints are violated (disallow rule)', () => {
            const selection: VariantSelectionItem[] = [
                { typeValue: "Material", optionValue: "Leather", typeIndex: 0, optionIndex1Based: 1 },
                { typeValue: "Color", optionValue: "Blue", typeIndex: 1, optionIndex1Based: 2 } // Leather + Blue is disallowed
            ];
            const result = validateSelection(selection, constraints);
            expect(result.valid).toBe(false);
            expect(result.blockedBy).toContain("c2");
        });

        it('should pass if trigger condition is not met', () => {
            const selection: VariantSelectionItem[] = [
                { typeValue: "Color", optionValue: "Green", typeIndex: 0, optionIndex1Based: 2 }, // Green triggers nothing
                { typeValue: "Size", optionValue: "Small", typeIndex: 1, optionIndex1Based: 1 }
            ];
            const result = validateSelection(selection, constraints);
            expect(result.valid).toBe(true);
        });

        it('should pass if target type is not selected yet', () => {
            const selection: VariantSelectionItem[] = [
                { typeValue: "Color", optionValue: "Red", typeIndex: 0, optionIndex1Based: 1 }
                // Size not selected
            ];
            const result = validateSelection(selection, constraints);
            expect(result.valid).toBe(true);
        });
    });

    describe('getAvailableOptions', () => {
        const variantTypes: VariantType[] = [
            {
                value: "Color",
                variantOptions: [{ value: "Red" }, { value: "Blue" }, { value: "Green" }]
            },
            {
                value: "Size",
                variantOptions: [{ value: "Small" }, { value: "Large" }, { value: "X-Large" }]
            }
        ];

        it('should return valid options considering valid selection', () => {
            // Current selection: Color = Red.
            // Rule: If Color=Red, Size must be [Large, X-Large].
            // So getAvailableOptions("Size") should return [Large, X-Large].
            const currentSelection: VariantSelectionItem[] = [
                { typeValue: "Color", optionValue: "Red", typeIndex: 0, optionIndex1Based: 1 }
            ];

            const availableSizes = getAvailableOptions(variantTypes[1], currentSelection, constraints);
            expect(availableSizes.map(o => o.value)).toEqual(["Large", "X-Large"]);
        });

        it('should return all options if no constraint applies', () => {
            // Current selection: Color = Green (no constraints).
            const currentSelection: VariantSelectionItem[] = [
                { typeValue: "Color", optionValue: "Green", typeIndex: 0, optionIndex1Based: 3 }
            ];

            const availableSizes = getAvailableOptions(variantTypes[1], currentSelection, constraints);
            expect(availableSizes.map(o => o.value)).toEqual(["Small", "Large", "X-Large"]);
        });

        it('should filter options that would violate constraints if selected', () => {
            // Current selection: Material = Leather.
            // Rule: If Material=Leather, Color disallowed Blue.
            // So getAvailableOptions("Color") should NOT include Blue.
            const currentSelection: VariantSelectionItem[] = [
                { typeValue: "Material", optionValue: "Leather", typeIndex: 2, optionIndex1Based: 1 }
            ];
            // Reuse variantTypes[0] which is Color
            const availableColors = getAvailableOptions(variantTypes[0], currentSelection, constraints);
            expect(availableColors.map(o => o.value)).toEqual(["Red", "Green"]); // Blue excluded
        });
    });
});
