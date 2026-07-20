'use strict';
const path=require('path'); const fs=require('fs-extra');
class FileWriter {
  constructor({force=false,dryRun=false}={}){this.force=force;this.dryRun=dryRun;}
  async write(file,content){ const absolute=path.resolve(file); const exists=await fs.pathExists(absolute); if(exists&&!this.force) {throw new Error(`El archivo ya existe y no se autorizó sobrescritura: ${absolute}. Use --force.`);} if(!this.dryRun){await fs.ensureDir(path.dirname(absolute));await fs.writeFile(absolute,content,'utf8');} return {absolutePath:absolute,written:!this.dryRun,overwritten:exists}; }
}
module.exports={FileWriter};
