import type { VariantType } from 'product-variants-core';

interface VariantBuilderProps {
    variantTypes: VariantType[];
    onChange: (types: VariantType[]) => void;
}

export function VariantBuilder({ variantTypes, onChange }: VariantBuilderProps) {
    const addType = () => {
        onChange([...variantTypes, { value: '', variantOptions: [] }]);
    };

    const updateType = (index: number, newValue: string) => {
        const next = [...variantTypes];
        next[index] = { ...next[index], value: newValue };
        onChange(next);
    };

    const removeType = (index: number) => {
        onChange(variantTypes.filter((_, i) => i !== index));
    };

    const addOption = (typeIndex: number) => {
        const next = [...variantTypes];
        const type = next[typeIndex];
        next[typeIndex] = {
            ...type,
            variantOptions: [...type.variantOptions, { value: '' }],
        };
        onChange(next);
    };

    const updateOption = (typeIndex: number, optionIndex: number, newValue: string) => {
        const next = [...variantTypes];
        const type = next[typeIndex];
        const newOptions = [...type.variantOptions];
        newOptions[optionIndex] = { value: newValue };
        next[typeIndex] = { ...type, variantOptions: newOptions };
        onChange(next);
    };

    const removeOption = (typeIndex: number, optionIndex: number) => {
        const next = [...variantTypes];
        const type = next[typeIndex];
        next[typeIndex] = {
            ...type,
            variantOptions: type.variantOptions.filter((_, i) => i !== optionIndex),
        };
        onChange(next);
    };

    return (
        <div className="variant-builder">
            <div className="header-row">
                <h2>Variant Types</h2>
                <button onClick={addType} className="btn-primary">
                    <span>+</span> Add Type
                </button>
            </div>

            <div className="types-grid">
                {variantTypes.map((type, tIdx) => (
                    <div key={tIdx} className="type-card">
                        <div className="type-header">
                            <input
                                type="text"
                                className="input-title"
                                value={type.value}
                                onChange={(e) => updateType(tIdx, e.target.value)}
                                placeholder="e.g. Color, Size"
                            />
                            <button
                                className="btn-icon danger"
                                onClick={() => removeType(tIdx)}
                                aria-label="Remove Type"
                                title="Remove Variant Type"
                            >&times;</button>
                        </div>

                        <div className="options-grid">
                            {type.variantOptions.map((opt, oIdx) => (
                                <div key={oIdx} className="option-chip">
                                    <input
                                        type="text"
                                        value={opt.value}
                                        onChange={(e) => updateOption(tIdx, oIdx, e.target.value)}
                                        placeholder="Value"
                                    />
                                    <button
                                        className="remove-opt-btn"
                                        onClick={() => removeOption(tIdx, oIdx)}
                                        title="Remove Option"
                                    >&times;</button>
                                </div>
                            ))}
                            <button className="btn-text" onClick={() => addOption(tIdx)}>
                                + Add Option
                            </button>
                        </div>
                    </div>
                ))}

                {variantTypes.length === 0 && (
                    <div className="empty-state">
                        <p>No variant types defined yet.</p>
                        <button onClick={addType} className="btn-primary" style={{ marginTop: '1rem' }}>
                            Start by adding a Variant Type
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
