import { ChildVariant, VariantSelectionItem } from "./index";

export type ModifierOperation = "add" | "subtract" | "multiply" | "set";

export type ModifierCondition = {
    typeValue: string;
    optionValue: string | string[]; // Can match strictly or be in a list
};

export type VariantModifier = {
    id: string;
    description?: string;
    /**
     * The condition that triggers this modifier.
     * e.g. "IF Size is XXL"
     */
    if: ModifierCondition;
    /**
     * The changes to apply to the variant fields.
     */
    then: {
        /** The field on ChildVariant to modify (e.g. 'cost', 'weight', 'sku') */
        field: keyof ChildVariant & string; // restrict to string keys for safety
        operation: ModifierOperation;
        value: string | number;
    }[];
};

/**
 * Checks if a selection matches the modifier condition.
 */
function isConditionMet(
    selection: VariantSelectionItem[],
    condition: ModifierCondition
): boolean {
    const selectedItem = selection.find((s) => s.typeValue === condition.typeValue);
    if (!selectedItem) return false;

    const val = selectedItem.optionValue;
    const target = condition.optionValue;

    if (Array.isArray(target)) {
        return target.includes(val);
    }
    return val === target;
}

/**
 * Applies a list of modifiers to a base product configuration
 * based on the user's current selection.
 *
 * @param baseProduct The starting state of the product variant (e.g. base price)
 * @param selection The current options selected by the user
 * @param modifiers The list of rules to apply
 */
export function applyModifiers<TChild extends ChildVariant>(
    baseProduct: TChild,
    selection: VariantSelectionItem[],
    modifiers: VariantModifier[]
): TChild {
    // Clone to avoid mutating the original
    const result: any = { ...baseProduct };

    for (const mod of modifiers) {
        if (isConditionMet(selection, mod.if)) {
            for (const action of mod.then) {
                const currentVal = result[action.field];
                const changeVal = action.value;

                // Handle numeric operations
                if (typeof currentVal === "number" && typeof changeVal === "number") {
                    switch (action.operation) {
                        case "add":
                            result[action.field] = currentVal + changeVal;
                            break;
                        case "subtract":
                            result[action.field] = currentVal - changeVal;
                            break;
                        case "multiply":
                            result[action.field] = currentVal * changeVal;
                            break;
                        case "set":
                            result[action.field] = changeVal;
                            break;
                    }
                }
                // Handle string operations (mostly append/set)
                else if (typeof currentVal === "string") {
                    switch (action.operation) {
                        case "add":
                            result[action.field] = currentVal + String(changeVal);
                            break;
                        case "set":
                            result[action.field] = String(changeVal);
                            break;
                        // Subtract/Multiply don't make much sense for strings, ignoring for safety
                    }
                }
                // Fallback or initialization (if field was null/undefined)
                else if (currentVal == null) {
                    if (action.operation === "set" || action.operation === "add") {
                        result[action.field] = changeVal;
                    }
                }
            }
        }
    }

    return result as TChild;
}
