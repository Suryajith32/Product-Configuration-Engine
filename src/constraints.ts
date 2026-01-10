import type { VariantOption, VariantSelectionItem, VariantType } from "./index";

export type ConstraintOperator = "equals" | "not_equals" | "in" | "not_in";

export type SimpleCondition = {
  typeValue: string;
  optionValue: string | string[];
  operator?: ConstraintOperator;
};

export type RecursiveCondition = {
  operator: "AND" | "OR";
  conditions: LogicCondition[];
};

export type LogicCondition = SimpleCondition | RecursiveCondition;

// Backward compatibility or alias for cleaner code
export type ConstraintCondition = LogicCondition;

export type VariantConstraint = {
  id: string;
  description?: string;
  /**
   * The condition that triggers this constraint.
   * Can be a simple check (e.g. "Color is Red") or a complex recursive logic ("A AND (B OR C)")
   */
  if: LogicCondition;
  /**
   * The effect enforced when the condition is met.
   * e.g. "THEN Size must be in [S, M]"
   */
  then: {
    typeValue: string;
    /**
     * If 'allowed', only these options are valid.
     * If 'disallowed', these options are invalid.
     */
    action: "allow" | "disallow";
    options: string[];
  };
};

function isSimpleCondition(c: LogicCondition): c is SimpleCondition {
  return (c as SimpleCondition).typeValue !== undefined;
}

/**
 * Checks if a specific selection satisfies a condition (Recursive).
 */
export function isConditionMet(
  selection: VariantSelectionItem[],
  condition: LogicCondition
): boolean {
  // Case 1: Simple Leaf Condition
  if (isSimpleCondition(condition)) {
    const selectedItem = selection.find((s) => s.typeValue === condition.typeValue);
    // If the variant type is not selected at all, the condition assumes "false" unless we assume strictly negation?
    // Generally, "If Color is Red" -> if Color not selected, it's not Red.
    if (!selectedItem) return false;

    const val = selectedItem.optionValue;
    const target = condition.optionValue;

    let op = condition.operator;
    if (!op) {
      op = Array.isArray(target) ? "in" : "equals";
    }

    switch (op) {
      case "equals":
        return val === target;
      case "not_equals":
        return val !== target;
      case "in":
        return Array.isArray(target) && target.includes(val);
      case "not_in":
        return Array.isArray(target) && !target.includes(val);
      default:
        return false;
    }
  }

  // Case 2: Recursive Group (AND / OR)
  const { operator, conditions } = condition as RecursiveCondition;
  if (!conditions || conditions.length === 0) return false;

  if (operator === "AND") {
    // All must be true
    return conditions.every((c) => isConditionMet(selection, c));
  } else if (operator === "OR") {
    // At least one must be true
    return conditions.some((c) => isConditionMet(selection, c));
  }

  return false;
}

export type ValidatorResult = {
  valid: boolean;
  blockedBy: string[]; // IDs of constraints that blocked this
};

/**
 * Checks if a partial or complete selection is valid against a set of constraints.
 */
export function validateSelection(
  selection: VariantSelectionItem[],
  constraints: VariantConstraint[]
): ValidatorResult {
  const blockedBy: string[] = [];

  for (const constraint of constraints) {
    if (isConditionMet(selection, constraint.if)) {
      // The "IF" condition is active. Now check the "THEN" rule.
      const targetType = constraint.then.typeValue;
      const targetSelection = selection.find((s) => s.typeValue === targetType);

      // If the user hasn't made a selection for the target type yet, strictly speaking,
      // it's not invalid *yet* (unless we enforce completeness).
      // But if they HAVE selected something, we must check it.
      if (targetSelection) {
        const val = targetSelection.optionValue;
        const allowedList = constraint.then.options;

        if (constraint.then.action === "allow") {
          // MUST be in the list
          if (!allowedList.includes(val)) {
            blockedBy.push(constraint.id);
          }
        } else if (constraint.then.action === "disallow") {
          // MUST NOT be in the list
          if (allowedList.includes(val)) {
            blockedBy.push(constraint.id);
          }
        }
      }
    }
  }

  return {
    valid: blockedBy.length === 0,
    blockedBy,
  };
}

/**
 * Returns the list of valid options for a specific variant type,
 * considering the CURRENT selections made in other types.
 */
export function getAvailableOptions(
  variantType: VariantType,
  currentSelection: VariantSelectionItem[],
  constraints: VariantConstraint[]
): VariantOption[] {
  // We want to return options from `variantType` that would NOT violate any constraints
  // if added to `currentSelection`.

  return variantType.variantOptions.filter((opt) => {
    // Construct a hypothetical selection: current + this option
    // (replace existing selection for this type if present)
    const nextSelection = [
      ...currentSelection.filter((s) => s.typeValue !== variantType.value),
      {
        typeValue: variantType.value,
        optionValue: opt.value,
        // Mocking indices since they aren't critical for logic, only values
        typeIndex: -1,
        optionIndex1Based: -1,
      },
    ];

    const result = validateSelection(nextSelection, constraints);
    return result.valid;
  });
}
