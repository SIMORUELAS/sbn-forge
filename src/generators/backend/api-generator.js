'use strict';
const path=require('path');
const {TemplateEngine}=require('../../core/template-engine'); const {FileWriter}=require('../../core/file-writer'); const {OutputManager}=require('../../core/output-manager');
const TEMPLATES=[
 ['backend/routes.hbs', c=>`${c.names.moduleName}.routes.js`],['backend/controller.hbs',c=>`${c.names.moduleName}.controller.js`],['backend/service.hbs',c=>`${c.names.moduleName}.service.js`],['backend/repository.hbs',c=>`${c.names.moduleName}.repository.js`],['backend/schema.hbs',c=>`${c.names.moduleName}.schema.js`],['backend/readme.hbs',()=> 'README.md']
];
async function generateApi(context,{output='./output',force=false,dryRun=false,logger={info(){}}}={}){
 const templatesDirectory=path.resolve(__dirname,'../../templates'); const engine=new TemplateEngine({templatesDirectory}); const manager=new OutputManager({output,moduleName:context.names.moduleName}); const writer=new FileWriter({force,dryRun}); await manager.prepare({dryRun}); const files=[];
 for(const [template,fileName] of TEMPLATES){const relativePath=fileName(context);const target=manager.resolve(relativePath);const content=await engine.render(template,context);await writer.write(target,content);files.push({relativePath:manager.relative(target),absolutePath:target});logger.info(`Generado ${relativePath}`);}
 const manifest={manifestVersion:'1.0',generator:context.generator,source:context.source,module:{schema:context.schema,table:context.table,name:context.names.moduleName,routeBase:context.names.routeBase},capabilities:context.capabilities,permissions:context.permissions,files:files.map(f=>f.relativePath),definition:{columns:context.columns.map(c=>({name:c.name,type:c.type,nullable:c.nullable,primaryKey:c.primaryKey,writable:c.writable,foreignKey:c.foreignKey||null}))}};
 const manifestTarget=manager.resolve('sbn-forge.manifest.json');await writer.write(manifestTarget,`${JSON.stringify(manifest,null,2)}\n`);files.push({relativePath:manager.relative(manifestTarget),absolutePath:manifestTarget});
 return {moduleDirectory:manager.moduleDirectory,manifestPath:manifestTarget,files,manifest};
}
module.exports={generateApi};
