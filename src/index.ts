export type VariantOption = { value: string };

/**
 * Matches your app's shape (`variantTypes: { value, variantOptions: {value}[] }[]`)
 * but is intentionally generic and framework-agnostic.
 */
export type VariantType = {
  value: string;
  variantOptions: VariantOption[];
};

export type VariantSelectionItem = {
  /** 0-based index into `variantTypes` */
  typeIndex: number;
  /** 1-based index into `variantTypes[typeIndex].variantOptions` */
  optionIndex1Based: number;
  /** `variantTypes[typeIndex].value` */
  typeValue: string;
  /** `variantTypes[typeIndex].variantOptions[optionIndex1Based-1].value` */
  optionValue: string;
};

/**
 * Represents a concrete variant combination (a "child product"/variant row).
 * You can extend this type in your app with more fields if needed.
 */
export type ChildVariant = {
  variantKey: string;
  title?: string;
  sku?: string;
  cost?: number | null;
  stock?: number | null;
  imageIds?: number[];
};

export type GenerateChildVariantsOptions<TChild extends ChildVariant> = {
  /**
   * When generating, keep any existing child variant with the same variantKey.
   * This is useful to preserve user-entered SKU/price/stock when options change.
   */
  existing?: readonly TChild[];
  /**
   * Create a default child variant for a new variantKey.
   * If omitted, a simple default object is created.
   */
  createDefault?: (variantKey: string) => TChild;
  /**
   * If true, filters out combinations where any option value is missing/blank.
   * This mirrors the UI behavior where empty option strings produce unusable titles.
   */
  filterInvalidTitles?: boolean;
  /**
   * Separator used to create a human-readable label like "Red - Large".
   */
  labelSeparator?: string;
  /**
   * Separator used to build/parse `variantKey` strings (defaults to "-").
   * Keep this consistent with the `variantKey` values you store.
   */
  keySeparator?: string;
};

/**
 * Returns cartesian combinations of 1-based indices.
 * Example: counts [2,3] -> [[1,1],[1,2],[1,3],[2,1],[2,2],[2,3]]
 */
export function cartesianIndexProduct(
  optionCounts: readonly number[]
): number[][] {
  if (!optionCounts || optionCounts.length === 0) return [];
  const [firstCount, ...rest] = optionCounts;
  if (!Number.isFinite(firstCount) || firstCount <= 0) return [];

  const first = Array.from({ length: firstCount }, (_, i) => i + 1);
  const remaining = cartesianIndexProduct(rest);
  return first.flatMap((idx) =>
    remaining.length ? remaining.map((combo) => [idx, ...combo]) : [[idx]]
  );
}

export function toVariantKey(
  indices1Based: readonly number[],
  separator = "-"
): string {
  return indices1Based.join(separator);
}

export function parseVariantKey(variantKey: string, separator = "-"): number[] {
  if (!variantKey) return [];
  return variantKey.split(separator).map((s) => {
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  });
}

export function sortVariantKeysAsc(
  a: string,
  b: string,
  separator = "-"
): number {
  const ak = parseVariantKey(a, separator);
  const bk = parseVariantKey(b, separator);
  const len = Math.max(ak.length, bk.length);
  for (let i = 0; i < len; i++) {
    const av = ak[i] ?? 0;
    const bv = bk[i] ?? 0;
    if (av !== bv) return av - bv;
  }
  return 0;
}

/**
 * Builds the human-readable variant label for a given variantKey using option values.
 * Example: variantKey "1-2" with Color=[Red,Blue], Size=[S,M] -> "Red - M"
 */
export function variantKeyToLabel(
  variantKey: string,
  variantTypes: readonly VariantType[],
  labelSeparator = " - ",
  keySeparator = "-"
): string {
  const indices = parseVariantKey(variantKey, keySeparator);
  const values = indices.map((idx1Based, typeIndex) => {
    const option =
      variantTypes[typeIndex]?.variantOptions?.[idx1Based - 1]?.value ?? "";
    return option;
  });
  return variantTypes.length > 1
    ? values.join(labelSeparator)
    : values.join("");
}

export function variantKeyToSelection(
  variantKey: string,
  variantTypes: readonly VariantType[],
  keySeparator = "-"
): VariantSelectionItem[] {
  const indices = parseVariantKey(variantKey, keySeparator);
  return indices.map((idx1Based, typeIndex) => {
    const typeValue = variantTypes[typeIndex]?.value ?? "";
    const optionValue =
      variantTypes[typeIndex]?.variantOptions?.[idx1Based - 1]?.value ?? "";
    return {
      typeIndex,
      optionIndex1Based: idx1Based,
      typeValue,
      optionValue,
    };
  });
}

export function variantKeyToValues(
  variantKey: string,
  variantTypes: readonly VariantType[],
  keySeparator = "-"
): string[] {
  return variantKeyToSelection(variantKey, variantTypes, keySeparator).map(
    (s) => s.optionValue
  );
}

export type VariantValuesToKeyOptions = {
  keySeparator?: string;
  /** If true, matches option values case-insensitively */
  caseInsensitive?: boolean;
  /** If true, trims input values and option values before matching */
  trim?: boolean;
};

export function variantValuesToKey(
  values: readonly string[],
  variantTypes: readonly VariantType[],
  options: VariantValuesToKeyOptions = {}
): string {
  const { keySeparator = "-", caseInsensitive = false, trim = true } = options;
  const normalize = (s: string) => {
    const x = trim ? s.trim() : s;
    return caseInsensitive ? x.toLowerCase() : x;
  };

  const indices1Based = variantTypes.map((t, i) => {
    const desired = normalize(values[i] ?? "");
    const idx0 = t.variantOptions.findIndex(
      (o) => normalize(o.value) === desired
    );
    return idx0 >= 0 ? idx0 + 1 : 0;
  });

  return toVariantKey(indices1Based, keySeparator);
}

export function isUsableLabel(label: string, labelSeparator = " - "): boolean {
  const trimmed = label.trim();
  if (!trimmed) return false;
  // Prevent cases like " - M" or "Red - " (mirrors UI checks)
  if (trimmed.startsWith(labelSeparator.trim())) return false;
  if (trimmed.endsWith(labelSeparator.trim())) return false;
  if (trimmed.startsWith("-") || trimmed.endsWith("-")) return false;
  return true;
}

/**
 * Generates all child variants implied by `variantTypes`.
 * - Uses 1-based indices to match your UI (`variantKey` like "1-2")
 * - Preserves existing children when `options.existing` is provided
 */
export function generateChildVariants<
  TChild extends ChildVariant = ChildVariant
>(
  variantTypes: readonly VariantType[],
  options: GenerateChildVariantsOptions<TChild> = {}
): TChild[] {
  const {
    existing = [],
    createDefault,
    filterInvalidTitles = true,
    labelSeparator = " - ",
    keySeparator = "-",
  } = options;

  const counts = variantTypes.map((t) => t.variantOptions?.length ?? 0);
  const combos = cartesianIndexProduct(counts);

  const existingMap = new Map(existing.map((c) => [c.variantKey, c]));

  const children = combos.map((indices) => {
    const key = toVariantKey(indices, keySeparator);
    const existingChild = existingMap.get(key);
    if (existingChild) return existingChild;
    if (createDefault) return createDefault(key);
    // Default is only guaranteed to satisfy the base `ChildVariant` shape.
    // If consumers use a narrower `TChild`, they should pass `createDefault`.
    return {
      variantKey: key,
      title: "",
      sku: "",
      cost: null,
      stock: null,
      imageIds: [],
    } as unknown as TChild;
  });

  const sorted = [...children].sort((x, y) =>
    sortVariantKeysAsc(x.variantKey, y.variantKey, keySeparator)
  );

  if (!filterInvalidTitles) return sorted;

  return sorted.filter((child) => {
    const label = variantKeyToLabel(
      child.variantKey,
      variantTypes,
      labelSeparator,
      keySeparator
    );
    return isUsableLabel(label, labelSeparator);
  });
}

export type ValidateVariantTypesResult = {
  errors: string[];
  warnings: string[];
};

export function validateVariantTypes(
  variantTypes: readonly VariantType[]
): ValidateVariantTypesResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!Array.isArray(variantTypes) || variantTypes.length === 0) {
    warnings.push("No variant types provided.");
    return { errors, warnings };
  }

  const typeNameCounts = new Map<string, number>();

  for (let ti = 0; ti < variantTypes.length; ti++) {
    const t = variantTypes[ti];
    const typeName = (t?.value ?? "").trim();
    if (!typeName)
      errors.push(`Variant type at index ${ti} is missing a value.`);

    typeNameCounts.set(typeName, (typeNameCounts.get(typeName) ?? 0) + 1);

    const opts = t?.variantOptions ?? [];
    if (!Array.isArray(opts) || opts.length === 0) {
      warnings.push(`Variant type "${typeName || ti}" has no options.`);
      continue;
    }

    const optionCounts = new Map<string, number>();
    for (let oi = 0; oi < opts.length; oi++) {
      const ov = (opts[oi]?.value ?? "").trim();
      if (!ov)
        warnings.push(
          `Empty option value at type "${typeName || ti}", option index ${oi}.`
        );
      optionCounts.set(ov, (optionCounts.get(ov) ?? 0) + 1);
    }

    for (const [ov, count] of optionCounts.entries()) {
      if (ov && count > 1) {
        warnings.push(`Duplicate option "${ov}" in type "${typeName || ti}".`);
      }
    }
  }

  for (const [typeName, count] of typeNameCounts.entries()) {
    if (typeName && count > 1) {
      warnings.push(`Duplicate variant type name "${typeName}".`);
    }
  }

  return { errors, warnings };
}

export type NormalizeVariantTypesOptions = {
  trim?: boolean;
  dropEmptyTypes?: boolean;
  dropEmptyOptions?: boolean;
  dedupeOptions?: boolean;
  caseInsensitiveDedupe?: boolean;
};

export type NormalizeVariantTypesResult = {
  variantTypes: VariantType[];
  report: {
    droppedTypes: number;
    droppedOptions: number;
    dedupedOptions: number;
  };
};

export function normalizeVariantTypes(
  variantTypes: readonly VariantType[],
  options: NormalizeVariantTypesOptions = {}
): NormalizeVariantTypesResult {
  const {
    trim = true,
    dropEmptyTypes = true,
    dropEmptyOptions = true,
    dedupeOptions = true,
    caseInsensitiveDedupe = false,
  } = options;

  const normalize = (s: string) => {
    const x = trim ? s.trim() : s;
    return caseInsensitiveDedupe ? x.toLowerCase() : x;
  };

  let droppedTypes = 0;
  let droppedOptions = 0;
  let dedupedOptionsCount = 0;

  const out: VariantType[] = [];
  for (const t of variantTypes ?? []) {
    const typeValueRaw = t?.value ?? "";
    const typeValue = trim ? typeValueRaw.trim() : typeValueRaw;

    const optionsIn = Array.isArray(t?.variantOptions) ? t.variantOptions : [];
    const seen = new Set<string>();

    const optionsOut: VariantOption[] = [];
    for (const o of optionsIn) {
      const vRaw = o?.value ?? "";
      const v = trim ? vRaw.trim() : vRaw;

      if (dropEmptyOptions && !v) {
        droppedOptions++;
        continue;
      }

      if (dedupeOptions) {
        const key = normalize(v);
        if (seen.has(key)) {
          dedupedOptionsCount++;
          continue;
        }
        seen.add(key);
      }

      optionsOut.push({ value: v });
    }

    if (dropEmptyTypes && !typeValue) {
      droppedTypes++;
      continue;
    }

    out.push({ value: typeValue, variantOptions: optionsOut });
  }

  return {
    variantTypes: out,
    report: {
      droppedTypes,
      droppedOptions,
      dedupedOptions: dedupedOptionsCount,
    },
  };
}

export type ReconcileChildVariantsOptions<TChild extends ChildVariant> = {
  /** Existing children created against `previousVariantTypes` */
  existing?: readonly TChild[];
  /** Create a default child variant for a new combination */
  createDefault?: (variantKey: string) => TChild;
  /** Separator used to create labels (used only if `filterInvalidTitles` is true) */
  labelSeparator?: string;
  /** Separator used to build/parse `variantKey` strings */
  keySeparator?: string;
  /** If true, filters out combinations where any option value is missing/blank */
  filterInvalidTitles?: boolean;
  /** If true, matches option values case-insensitively when reconciling */
  caseInsensitiveMatch?: boolean;
  /** If true, trims option values before matching */
  trimMatch?: boolean;
};

export type ReconcileChildVariantsResult<TChild extends ChildVariant> = {
  children: TChild[];
  /** Existing children that could not be mapped to a new combination */
  dropped: TChild[];
};

function toSignature(
  optionValues: readonly string[],
  caseInsensitive: boolean,
  trim: boolean
): string {
  const normalize = (s: string) => {
    const x = trim ? s.trim() : s;
    return caseInsensitive ? x.toLowerCase() : x;
  };
  // Use a delimiter unlikely to appear in human-entered option values.
  return optionValues.map((v) => normalize(v)).join("\u0001");
}

/**
 * Reconciles variants across variant type/option changes by matching combinations
 * using option values (not old 1-based indices). This preserves SKUs/prices/etc
 * even if options are re-ordered or inserted.
 */
export function reconcileChildVariants<
  TChild extends ChildVariant = ChildVariant
>(
  previousVariantTypes: readonly VariantType[],
  nextVariantTypes: readonly VariantType[],
  options: ReconcileChildVariantsOptions<TChild> = {}
): ReconcileChildVariantsResult<TChild> {
  const {
    existing = [],
    createDefault,
    labelSeparator = " - ",
    keySeparator = "-",
    filterInvalidTitles = true,
    caseInsensitiveMatch = false,
    trimMatch = true,
  } = options;

  const previousBySignature = new Map<string, TChild>();
  for (const child of existing) {
    const values = variantKeyToValues(
      child.variantKey,
      previousVariantTypes,
      keySeparator
    );
    const sig = toSignature(values, caseInsensitiveMatch, trimMatch);
    // First wins; if you have duplicates, callers should resolve upstream.
    if (!previousBySignature.has(sig)) previousBySignature.set(sig, child);
  }

  const usedSignatures = new Set<string>();

  const nextChildren = generateChildVariants<TChild>(nextVariantTypes, {
    existing: [],
    createDefault: (variantKey) => {
      if (createDefault) return createDefault(variantKey);
      return {
        variantKey,
        title: "",
        sku: "",
        cost: null,
        stock: null,
        imageIds: [],
      } as unknown as TChild;
    },
    filterInvalidTitles,
    labelSeparator,
    keySeparator,
  }).map((child) => {
    const values = variantKeyToValues(
      child.variantKey,
      nextVariantTypes,
      keySeparator
    );
    const sig = toSignature(values, caseInsensitiveMatch, trimMatch);
    const prev = previousBySignature.get(sig);
    if (!prev) return child;

    usedSignatures.add(sig);
    // Preserve all existing fields but update variantKey to the new indices.
    return { ...(prev as any), variantKey: child.variantKey } as TChild;
  });

  const dropped = existing.filter((child) => {
    const values = variantKeyToValues(
      child.variantKey,
      previousVariantTypes,
      keySeparator
    );
    const sig = toSignature(values, caseInsensitiveMatch, trimMatch);
    return !usedSignatures.has(sig);
  });

  return { children: nextChildren, dropped };
}

export * from "./constraints";
export * from "./modifiers";
