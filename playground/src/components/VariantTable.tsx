import { useMemo } from 'react';
import {
    generateChildVariants,
    variantKeyToLabel,
    variantKeyToSelection,
    validateSelection,
    applyModifiers
} from 'product-variants-core';
import type { VariantType, VariantConstraint, VariantModifier, ChildVariant } from 'product-variants-core';

interface VariantTableProps {
    variantTypes: VariantType[];
    constraints: VariantConstraint[];
    modifiers: VariantModifier[];
}

export function VariantTable({ variantTypes, constraints, modifiers }: VariantTableProps) {
    const children = useMemo(() => {
        try {
            return generateChildVariants(variantTypes);
        } catch (e) {
            console.error(e);
            return [];
        }
    }, [variantTypes]);

    const processedChildren = useMemo(() => {
        return children.map(child => {
            const selection = variantKeyToSelection(child.variantKey, variantTypes);
            const validation = validateSelection(selection, constraints);

            let finalChild = { ...child };
            if (validation.valid) {
                // Base product with initial cost 0, stock 0 etc. if not defined
                const base: ChildVariant = {
                    ...child,
                    cost: 100, // Demo base cost
                    sku: `PROD-${child.variantKey}`
                };
                finalChild = applyModifiers(base, selection, modifiers);
            }

            return {
                ...finalChild,
                isValid: validation.valid,
                blockedBy: validation.blockedBy
            };
        });
    }, [children, variantTypes, constraints, modifiers]);

    const getConstraintReason = (constraintId?: string) => {
        if (!constraintId) return null;
        const constraint = constraints.find(c => c.id === constraintId);
        if (!constraint) return 'Unknown constraint';

        // Simple readable format
        const ifPart = `IF ${constraint.if.typeValue} ${constraint.if.operator} '${constraint.if.optionValue}'`;
        const thenPart = `THEN ${constraint.then.typeValue} ${constraint.then.action} [${constraint.then.options.join(', ')}]`;

        return `${ifPart} ${thenPart}`;
    };

    return (
        <div className="variant-table-container">
            <h2>Generated Combinations <span>({children.length})</span></h2>
            <table className="data-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Variant Key</th>
                        <th>Status</th>
                        <th>SKU</th>
                        <th>Cost</th>
                    </tr>
                </thead>
                <tbody>
                    {processedChildren.length === 0 ? (
                        <tr>
                            <td colSpan={5} className="empty-state">
                                Add variant options to see combinations generated here.
                            </td>
                        </tr>
                    ) : (
                        processedChildren.map((child, idx) => (
                            <tr key={child.variantKey} style={{ opacity: child.isValid ? 1 : 0.7, background: child.isValid ? 'transparent' : '#fafafa' }}>
                                <td style={{ color: 'var(--color-text-tertiary)' }}>{idx + 1}</td>
                                <td>
                                    <div className="code-cell">{child.variantKey}</div>
                                    <div style={{ fontSize: '0.8rem', marginTop: '0.2rem', color: 'var(--color-text-secondary)' }}>
                                        {variantKeyToLabel(child.variantKey, variantTypes)}
                                    </div>
                                    {!child.isValid && child.blockedBy && (
                                        <div style={{
                                            marginTop: '0.4rem',
                                            fontSize: '0.75rem',
                                            color: '#EF4444',
                                            background: '#FEE2E2',
                                            padding: '0.2rem 0.5rem',
                                            borderRadius: '4px',
                                            display: 'inline-block'
                                        }}>
                                            <strong>Blocked:</strong> {getConstraintReason(child.blockedBy)}
                                        </div>
                                    )}
                                </td>
                                <td>
                                    {child.isValid ? (
                                        <span className="status-badge valid">Valid</span>
                                    ) : (
                                        <span className="status-badge invalid">Invalid</span>
                                    )}
                                </td>
                                <td className="sku-cell">
                                    {child.isValid ? child.sku : '-'}
                                </td>
                                <td>
                                    {child.isValid ? (
                                        <span className="diff-val">${child.cost}</span>
                                    ) : '-'}
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}
