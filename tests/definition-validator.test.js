'use strict'; const {validateDefinition}=require('../src/core/definition-validator'); const valid=require('../examples/ai_business_model_departments.json');
test('acepta definición certificada',()=>expect(validateDefinition(valid)).toBe(true));
test('rechaza columnas duplicadas',()=>{const bad=JSON.parse(JSON.stringify(valid));bad.columns.push({...bad.columns[0]});expect(()=>validateDefinition(bad)).toThrow(/duplicada/);});
test('requiere llave primaria',()=>{const bad=JSON.parse(JSON.stringify(valid));bad.columns.forEach(c=>delete c.primaryKey);expect(()=>validateDefinition(bad)).toThrow(/llave primaria/);});
