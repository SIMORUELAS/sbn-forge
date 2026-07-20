'use strict';
const path = require('path');
const fs = require('fs-extra');
const Handlebars = require('handlebars');
let registered=false;
function registerHelpers(){ if(registered){return;} registered=true; Handlebars.registerHelper('json', v=>JSON.stringify(v,null,2)); Handlebars.registerHelper('join', (arr,sep)=>arr.join(sep)); Handlebars.registerHelper('eq',(a,b)=>a===b); }
class TemplateEngine {
  constructor({ templatesDirectory }) { this.templatesDirectory=templatesDirectory; registerHelpers(); }
  async render(templateName, context){ const file=path.join(this.templatesDirectory, templateName); const source=await fs.readFile(file,'utf8'); return Handlebars.compile(source,{noEscape:true})(context).replace(/\r\n/g,'\n'); }
}
module.exports = { TemplateEngine, registerHelpers };
