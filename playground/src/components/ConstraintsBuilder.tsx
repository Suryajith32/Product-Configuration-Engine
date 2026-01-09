import type { VariantType, VariantConstraint } from 'product-variants-core';

interface ConstraintsBuilderProps {
    variantTypes: VariantType[];
    constraints: VariantConstraint[];
    onChange: (constraints: VariantConstraint[]) => void;
}

export function ConstraintsBuilder({ variantTypes, constraints, onChange }: ConstraintsBuilderProps) {
    const addConstraint = () => {
        const newConstraint: VariantConstraint = {
            id: crypto.randomUUID(),
            if: { typeValue: variantTypes[0]?.value || '', optionValue: '' },
            then: { typeValue: variantTypes[1]?.value || '', action: 'allow', options: [] }
        };
        onChange([...constraints, newConstraint]);
    };

    const removeConstraint = (index: number) => {
        onChange(constraints.filter((_, i) => i !== index));
    };

    const updateConstraint = (index: number, partial: Partial<VariantConstraint> | any) => {
        const next = [...constraints];
        next[index] = { ...next[index], ...partial };
        onChange(next);
    };

    const updateIf = (index: number, field: keyof VariantConstraint['if'], value: string) => {
        const current = constraints[index];
        updateConstraint(index, { if: { ...current.if, [field]: value } });
    };

    const updateThen = (index: number, field: keyof VariantConstraint['then'], value: any) => {
        const current = constraints[index];
        updateConstraint(index, { then: { ...current.then, [field]: value } });
    };

    return (
        <div className="constraints-builder">
            <div className="header-row">
                <h2>Constraints</h2>
                <button onClick={addConstraint} className="btn-primary" disabled={variantTypes.length < 2}>
                    <span>+</span> Add Rule
                </button>
            </div>
            <p style={{ marginTop: '0.5rem', marginBottom: '1.5rem', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
                Constraints restrict which combinations are valid. <br />
                <strong>Example:</strong> <em>"IF Color is Red THEN Size must be S"</em> prevents Red-M from being generated.
            </p>

            {variantTypes.length < 2 && (
                <div className="empty-state" style={{ padding: '1rem' }}>
                    Add at least 2 variant types to define constraints.
                </div>
            )}

            <div className="rules-list">
                {constraints.map((constraint, idx) => (
                    <div key={constraint.id} className="rule-card">
                        <div className="rule-header">
                            <span className="rule-index">Rule #{idx + 1}</span>
                            <button
                                className="btn-icon danger sm"
                                onClick={() => removeConstraint(idx)}
                                title="Remove Rule"
                            >&times;</button>
                        </div>

                        <div className="rule-logic">
                            <div className="logic-group">
                                <span className="keyword">IF</span>
                                <select
                                    value={constraint.if.typeValue}
                                    onChange={(e) => updateIf(idx, 'typeValue', e.target.value)}
                                >
                                    {variantTypes.map(t => <option key={t.value} value={t.value}>{t.value}</option>)}
                                </select>
                                <span>is</span>
                                <select
                                    value={constraint.if.optionValue as string}
                                    onChange={(e) => updateIf(idx, 'optionValue', e.target.value)}
                                >
                                    <option value="">Select Option...</option>
                                    {variantTypes.find(t => t.value === constraint.if.typeValue)?.variantOptions.map(o => (
                                        <option key={o.value} value={o.value}>{o.value}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="logic-group">
                                <span className="keyword">THEN</span>
                                <select
                                    value={constraint.then.typeValue}
                                    onChange={(e) => updateThen(idx, 'typeValue', e.target.value)}
                                >
                                    {variantTypes.filter(t => t.value !== constraint.if.typeValue).map(t => (
                                        <option key={t.value} value={t.value}>{t.value}</option>
                                    ))}
                                </select>
                                <select
                                    value={constraint.then.action}
                                    onChange={(e) => updateThen(idx, 'action', e.target.value)}
                                >
                                    <option value="allow">must be</option>
                                    <option value="disallow">cannot be</option>
                                </select>

                                <div className="multi-select">
                                    {variantTypes.find(t => t.value === constraint.then.typeValue)?.variantOptions.map(o => (
                                        <label key={o.value} className="checkbox-label">
                                            <input
                                                type="checkbox"
                                                checked={constraint.then.options.includes(o.value)}
                                                onChange={(e) => {
                                                    const currentOpts = constraint.then.options;
                                                    const newOpts = e.target.checked
                                                        ? [...currentOpts, o.value]
                                                        : currentOpts.filter(v => v !== o.value);
                                                    updateThen(idx, 'options', newOpts);
                                                }}
                                            />
                                            {o.value}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
                {constraints.length === 0 && variantTypes.length >= 2 && (
                    <div className="empty-state">No constraints defined.</div>
                )}
            </div>
        </div>
    );
}
