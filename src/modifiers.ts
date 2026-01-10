import type { ChildVariant, VariantSelectionItem } from "./index";
import { isConditionMet } from "./constraints";
import type { LogicCondition } from "./constraints";

export type ModifierOperation = "add" | "subtract" | "multiply" | "set";

export type VariantModifier = {
    id: string;
    description?: string;
    /**
     * The condition that triggers this modifier.
     * Can be a simple check or recursive logic.
     */
    if: LogicCondition;
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
