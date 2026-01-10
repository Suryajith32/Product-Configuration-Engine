import type { VariantType, LogicCondition, RecursiveCondition, SimpleCondition } from 'product-variants-core';

interface ConditionBuilderProps {
    condition: LogicCondition;
    onChange: (newCondition: LogicCondition) => void;
    onRemove?: () => void;
    variantTypes: VariantType[];
    depth?: number;
}

export function ConditionBuilder({ condition, onChange, onRemove, variantTypes, depth = 0 }: ConditionBuilderProps) {
    const isGroup = (c: LogicCondition): c is RecursiveCondition => 'conditions' in c;
    const isRoot = depth === 0;

    const handleTypeChange = (type: 'rule' | 'AND' | 'OR') => {
        if (type === 'rule') {
            // Convert to simple condition
            const simple: SimpleCondition = {
                typeValue: variantTypes[0]?.value || '',
                operator: 'equals',
                optionValue: ''
            };
            onChange(simple);
        } else {
            // Convert to group
            const group: RecursiveCondition = {
                operator: type,
                conditions: isGroup(condition) ? condition.conditions : []
            };
            // If converting from rule to group, maybe preserve the rule? 
            // For now, let's just make it an empty group or preserve existing children if it was already a group
            if (!isGroup(condition)) {
                group.conditions = [condition]; // Keep the current rule as a child
            }
            onChange(group);
        }
    };

    const updateSimpleField = (field: keyof SimpleCondition, value: any) => {
        if (isGroup(condition)) return;
        onChange({ ...condition, [field]: value });
    };

    const addSubCondition = () => {
        if (!isGroup(condition)) return;
        const newRule: SimpleCondition = {
            typeValue: variantTypes[0]?.value || '',
            operator: 'equals',
            optionValue: ''
        };
        onChange({
            ...condition,
            conditions: [...condition.conditions, newRule]
        });
    };

    const updateSubCondition = (index: number, newSub: LogicCondition) => {
        if (!isGroup(condition)) return;
        const newConditions = [...condition.conditions];
        newConditions[index] = newSub;
        onChange({ ...condition, conditions: newConditions });
    };

    const removeSubCondition = (index: number) => {
        if (!isGroup(condition)) return;
        const newConditions = condition.conditions.filter((_, i) => i !== index);
        onChange({ ...condition, conditions: newConditions });
    };

    const currentType = isGroup(condition) ? condition.operator : 'rule';

    return (
        <div className="condition-builder" style={{ marginLeft: depth * 20, padding: '5px', borderLeft: depth > 0 ? '2px solid #eee' : 'none' }}>
            <div className="condition-row" style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '5px' }}>
                {/* Node Type Selector */}
                <select
                    value={currentType}
                    onChange={(e) => handleTypeChange(e.target.value as any)}
                    className="input-xs"
                    style={{ fontWeight: isGroup(condition) ? 'bold' : 'normal', width: 'auto' }}
                >
                    <option value="rule">Single Rule</option>
                    <option value="AND">Group (AND)</option>
                    <option value="OR">Group (OR)</option>
                </select>

                {/* Simple Condition Inputs */}
                {!isGroup(condition) && (
                    <>
                        <span className="keyword">IF</span>
                        <select
                            value={condition.typeValue}
                            onChange={(e) => updateSimpleField('typeValue', e.target.value)}
                        >
                            {variantTypes.map(t => <option key={t.value} value={t.value}>{t.value}</option>)}
                        </select>

                        <select
                            value={condition.operator || 'equals'}
                            onChange={(e) => updateSimpleField('operator', e.target.value)}
                            style={{ width: 'auto' }}
                        >
                            <option value="equals">is (=)</option>
                            <option value="not_equals">is not (!=)</option>
                            <option value="in">is one of</option>
                            <option value="not_in">is not one of</option>
                        </select>

                        <select
                            value={condition.optionValue as string} // Todo: handle array for 'in'
                            onChange={(e) => updateSimpleField('optionValue', e.target.value)}
                        >
                            <option value="">Select Option...</option>
                            {variantTypes.find(t => t.value === condition.typeValue)?.variantOptions.map(o => (
                                <option key={o.value} value={o.value}>{o.value}</option>
                            ))}
                        </select>
                    </>
                )}

                {/* Remove Button for this node (if not root) */}
                {!isRoot && onRemove && (
                    <button onClick={onRemove} className="btn-icon danger xs" title="Remove">&times;</button>
                )}

                {/* Add Button for Groups */}
                {isGroup(condition) && (
                    <button onClick={addSubCondition} className="btn-secondary xs">+ Add Rule</button>
                )}
            </div>

            {/* Render Children if Group */}
            {isGroup(condition) && (
                <div className="condition-children" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {condition.conditions.map((sub, idx) => (
                        <ConditionBuilder
                            key={idx}
                            condition={sub}
                            onChange={(newSub) => updateSubCondition(idx, newSub)}
                            onRemove={() => removeSubCondition(idx)}
                            variantTypes={variantTypes}
                            depth={depth + 1}
                        />
                    ))}
                    {condition.conditions.length === 0 && (
                        <div style={{ paddingLeft: '20px', fontSize: '0.8rem', color: '#999', fontStyle: 'italic' }}>
                            Empty group (always false)
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
