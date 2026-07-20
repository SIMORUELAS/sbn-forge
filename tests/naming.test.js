'use strict'; const {buildNames,singularize}=require('../src/core/naming');
test('convierte ai_business_model_departments',()=>{const n=buildNames('ai_business_model_departments');expect(n.moduleName).toBe('ai-business-model-departments');expect(n.variableSingular).toBe('aiBusinessModelDepartment');expect(n.entitySingular).toBe('AiBusinessModelDepartment');expect(n.permissionPrefix).toBe('AI_BUSINESS_MODEL_DEPARTMENTS');});
test('singulariza terminación ies',()=>expect(singularize('categories')).toBe('category'));
