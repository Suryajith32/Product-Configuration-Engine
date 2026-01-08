# product-variants-core

**The Headless Product Configuration Engine.**

`product-variants-core` is a framework-agnostic library for building complex "E-Commerce Product Builders". It handles the hard logic of variant generation, dependency constraints, dynamic pricing modifiers, and state reconciliation so you can focus on building a beautiful UI.

**Zero dependencies. Pure TypeScript. < 2KB gzipped.**

---

### What's New
It is now a full-fledged **Product Configuration Engine** capable of handling complex rules and dynamic pricing.
- **Strict Validation**: You can define rules like _"Leather cannot be Pink"_.
- **Dynamic Calculations**: You can define rules like _"XXL adds $5.00"_.

---

## Features

- 🧬 **Variant Generation**: Instantly generate Cartesian product combinations (e.g., `Color: Red` + `Size: M` → `SKU-RED-M`).
- 🛡️ **Constraint Engine**: Define complex rules to prevent invalid selections (e.g., "Leather requires standard shipping", "Pink is not available in XXL").
- ⚡ **Modifier Engine**: Dynamic parameter calculation (e.g., "Size XXL adds $5.00 to price", "Gold material adds 'Premium' tag").
- 🔄 **Smart Reconciliation**: The "Killer Feature". Preserves user-entered data (SKUs, stock, prices) even when options are reordered, inserted, or renamed.
- ✨ **Input Normalization**: Automatically deduplicates and cleans messy user input.

## Installation

```bash
npm install product-variants-core
```

## Usage

### 1. Basic Variant Generation

Generate all possible combinations from option sets.

```typescript
import { generateChildVariants, VariantType } from "product-variants-core";

const variantTypes: VariantType[] = [
  { value: "Color", variantOptions: [{ value: "Red" }, { value: "Blue" }] },
  { value: "Size", variantOptions: [{ value: "S" }, { value: "M" }] },
  { value: "Material", variantOptions: [{ value: "Cotton" }, { value: "Silk" }] },
];

const children = generateChildVariants(variantTypes);
// Result: 8 combinations ("Red-S-Cotton", "Red-S-Silk", ...)
```

### 2. Constraint Engine (Validation)

Prevent users from selecting impossible combinations.

```typescript
import { validateSelection, getAvailableOptions, VariantConstraint } from "product-variants-core";

const constraints: VariantConstraint[] = [
  {
    id: "silk-color-limit",
    description: "Silk is only available in Red",
    if: { typeValue: "Material", optionValue: "Silk" },
    then: {
      typeValue: "Color",
      action: "allow", // Only allow these
      options: ["Red"]
    }
  }
];

// Check if a selection is valid
const result = validateSelection(userSelection, constraints);
if (!result.valid) {
  console.error("Invalid selection blocked by:", result.blockedBy);
}

// Get only valid next options for UI dropdowns
const allowedColors = getAvailableOptions(colorType, userSelection, constraints);
```

### 3. Modifier Engine (Dynamic Pricing)

Apply price adjustments or metadata changes based on selections.

```typescript
import { applyModifiers, VariantModifier } from "product-variants-core";

const modifiers: VariantModifier[] = [
  {
    id: "xxl-price",
    if: { typeValue: "Size", optionValue: "XXL" },
    then: [
      { field: "cost", operation: "add", value: 5.00 }, // +$5.00
      { field: "sku", operation: "add", value: "-extra" } // Suffix
    ]
  }
];

// Calculate final properties for a specific child variant
const finalChild = applyModifiers(baseChildVariant, userSelection, modifiers);
console.log(finalChild.cost); // Base cost + 5.00
```

### 4. Smart Reconciliation

The problem: You have a table of 50 variants with custom SKUs. The user adds a new "Material" option at the *beginning* of the list.
The solution: `reconcileChildVariants` matches existing rows by their **value signature**, not their index.

```typescript
import { reconcileChildVariants } from "product-variants-core";

// Old: [Color, Size]
// New: [Material, Color, Size]

const { children, dropped } = reconcileChildVariants(
  oldTypes, 
  newTypes, 
  { existing: currentRows }
);

// 'children' contains the new list, but "Red - M" preserves its SKU/Stock 
// even though its generated ID (variantKey) has completely changed.
```

## API Reference

### types
- `VariantType`, `VariantOption`, `ChildVariant`
- `VariantConstraint`, `VariantModifier`

### functions
- `generateChildVariants`
- `reconcileChildVariants`
- `validateSelection`
- `getAvailableOptions`
- `applyModifiers`
- `normalizeVariantTypes`
- `validateVariantTypes`

## License

MIT
