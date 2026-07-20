'use strict';
const crypto = require('crypto');
const { validateDefinition } = require('./definition-validator');
const { buildNames } = require('./naming');
function normalizeType(type) { const t=type.toLowerCase(); return t==='character varying'?'varchar':t==='timestamp without time zone'?'timestamp':t; }
function jsType(type) { const t=normalizeType(type); if (['bigint','integer','smallint','numeric','decimal'].includes(t)) {return 'number';} if (t==='boolean') {return 'boolean';} if (['json','jsonb'].includes(t)) {return 'object';} return 'string'; }
function createGeneratorContext(definition, { generatorVersion='0.1.0', generatedAt=new Date().toISOString() }={}) {
  validateDefinition(definition);
  const names=buildNames(definition.table);
  const columns=definition.columns.map((c,index)=>({
    ...c, index, type: normalizeType(c.type), jsType: jsType(c.type), nullable: c.nullable === true,
    primaryKey: c.primaryKey === true, generated: c.generated === true, hasDefault: c.default !== undefined,
    writable: c.writable !== false && !c.primaryKey && !c.generated && !['created_at','created_by','created_from','updated_at','updated_by','updated_from','deleted_at','deleted_by','version_no'].includes(c.name)
  }));
  const columnMap=Object.fromEntries(columns.map(c=>[c.name,c]));
  const primaryKeys=columns.filter(c=>c.primaryKey);
  const writableColumns=columns.filter(c=>c.writable);
  const capabilities={
    softDelete:Boolean(columnMap.deleted_at), audit:['created_at','created_by','updated_at','updated_by'].some(k=>columnMap[k]),
    versioning:Boolean(columnMap.version_no), organizationScope:Boolean(columnMap.organization_id), branchScope:Boolean(columnMap.branch_id),
    json:columns.some(c=>['json','jsonb'].includes(c.type)), foreignKeys:columns.some(c=>c.foreignKey), pagination:true, filtering:true, sorting:true
  };
  const permissions=['VIEW','CREATE','EDIT','DELETE'].map(op=>`${names.permissionPrefix}_${op}`);
  const hash=crypto.createHash('sha256').update(JSON.stringify(definition)).digest('hex');
  return { generator:{name:'SBN Forge',version:generatorVersion,generatedAt}, source:{type:'json',definitionHash:hash}, schema:definition.schema, table:definition.table, description:definition.description||'', names, columns, columnMap, primaryKeys, primaryKey:primaryKeys[0], writableColumns, foreignKeys:columns.filter(c=>c.foreignKey), capabilities, permissions, options:definition.options||{} };
}
module.exports = { createGeneratorContext, normalizeType, jsType };
