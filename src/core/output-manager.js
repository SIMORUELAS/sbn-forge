'use strict';
const path=require('path'); const fs=require('fs-extra');
class OutputManager {
  constructor({output,moduleName}){this.output=path.resolve(output);this.moduleName=moduleName;this.moduleDirectory=path.join(this.output,'modules',moduleName);}
  resolve(relativePath){return path.join(this.moduleDirectory,relativePath);}
  relative(file){return path.relative(this.output,file).split(path.sep).join('/');}
  async prepare({dryRun=false}={}){if(!dryRun){await fs.ensureDir(this.moduleDirectory);}return this.moduleDirectory;}
}
module.exports={OutputManager};
