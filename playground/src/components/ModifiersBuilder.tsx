import type { VariantType, VariantModifier } from 'product-variants-core';

interface ModifiersBuilderProps {
    variantTypes: VariantType[];
    modifiers: VariantModifier[];
    onChange: (modifiers: VariantModifier[]) => void;
}

export function ModifiersBuilder({ variantTypes, modifiers, onChange }: ModifiersBuilderProps) {
    const addModifier = () => {
        const newModifier: VariantModifier = {
            id: crypto.randomUUID(),
            if: { typeValue: variantTypes[0]?.value || '', optionValue: '' },
            then: [{ field: 'cost', operation: 'add', value: 0 }]
        };
        onChange([...modifiers, newModifier]);
    };

    const removeModifier = (index: number) => {
        onChange(modifiers.filter((_, i) => i !== index));
    };

    const updateModifier = (index: number, partial: Partial<VariantModifier> | any) => {
        const next = [...modifiers];
        next[index] = { ...next[index], ...partial };
        onChange(next);
    };

    const updateIf = (index: number, field: keyof VariantModifier['if'], value: string) => {
        const current = modifiers[index];
        updateModifier(index, { if: { ...current.if, [field]: value } });
    };

    const updateThen = (modIndex: number, actionIndex: number, field: string, value: any) => {
        const currentMod = modifiers[modIndex];
        const newThen = [...currentMod.then];
        newThen[actionIndex] = { ...newThen[actionIndex], [field]: value };
        updateModifier(modIndex, { then: newThen });
    };

    return (
        <div className="modifiers-builder">
            <div className="header-row">
                <h2>Modifiers</h2>
                <button onClick={addModifier} className="btn-primary" disabled={variantTypes.length === 0}>
                    <span>+</span> Add Modifier
                </button>
            </div>
            <p style={{ marginTop: '0.5rem', marginBottom: '1.5rem', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
                Modifiers change the properties of a variant based on selections. <br />
                <strong>Example:</strong> <em>"IF Size is XXL THEN Cost + 5"</em> increases the price for larger sizes.
            </p>
            <div className="rules-list">
                {modifiers.map((modifier, idx) => (
                    <div key={modifier.id} className="rule-card">
                        <div className="rule-header">
                            <span className="rule-index">Modifier #{idx + 1}</span>
                            <button
                                className="btn-icon danger sm"
                                onClick={() => removeModifier(idx)}
                            >&times;</button>
                        </div>

                        <div className="rule-logic">
                            <div className="logic-group">
                                <span className="keyword">IF</span>
                                <select
                                    value={modifier.if.typeValue}
                                    onChange={(e) => updateIf(idx, 'typeValue', e.target.value)}
                                >
                                    {variantTypes.map(t => <option key={t.value} value={t.value}>{t.value}</option>)}
                                </select>
                                <span>is</span>
                                <select
                                    value={modifier.if.optionValue as string}
                                    onChange={(e) => updateIf(idx, 'optionValue', e.target.value)}
                                >
                                    <option value="">Select Option...</option>
                                    {variantTypes.find(t => t.value === modifier.if.typeValue)?.variantOptions.map(o => (
                                        <option key={o.value} value={o.value}>{o.value}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="logic-group">
                                <span className="keyword">THEN</span>
                                {modifier.then.map((action, actionIdx) => (
                                    <div key={actionIdx} className="action-row">
                                        <select
                                            value={action.field}
                                            onChange={(e) => updateThen(idx, actionIdx, 'field', e.target.value)}
                                        >
                                            <option value="cost">Cost</option>
                                            <option value="sku">SKU Suffix</option>
                                        </select>

                                        <select
                                            value={action.operation}
                                            onChange={(e) => updateThen(idx, actionIdx, 'operation', e.target.value)}
                                        >
                                            <option value="add">Add (+)</option>
                                            <option value="subtract">Subtract (-)</option>
                                            <option value="set">Set (=)</option>
                                        </select>

                                        <input
                                            type="text"
                                            className="input-sm"
                                            value={action.value}
                                            onChange={(e) => {
                                                const val = action.field === 'sku' ? e.target.value : Number(e.target.value) || 0;
                                                updateThen(idx, actionIdx, 'value', val);
                                            }}
                                            placeholder="Value"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
                {modifiers.length === 0 && (
                    <div className="empty-state">No modifiers defined.</div>
                )}
            </div>
        </div>
    );
}
