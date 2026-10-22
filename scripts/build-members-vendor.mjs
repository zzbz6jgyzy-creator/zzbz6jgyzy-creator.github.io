// Run from a temporary directory with @supabase/supabase-js@2.118.0 and esbuild@0.25.12 installed.
// Example: npm i --no-save --no-package-lock @supabase/supabase-js@2.118.0 esbuild@0.25.12
import {createRequire} from 'node:module';
import {copyFileSync,existsSync,readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
const require=createRequire(resolve(process.cwd(),'package.json'));
const {build}=require('esbuild');
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const result=await build({metafile:true,stdin:{contents:"export {createClient} from '@supabase/supabase-js';",resolveDir:process.cwd(),sourcefile:'supabase-entry.js'},outfile:resolve(root,'vendor/supabase-2.118.0.js'),bundle:true,minify:true,platform:'browser',format:'esm',target:['es2020'],legalComments:'none'});
copyFileSync(require.resolve('@supabase/supabase-js/package.json').replace(/package.json$/,'LICENSE'),resolve(root,'vendor/supabase-LICENSE'));

// Keep the notices of every runtime package included in the self-hosted bundle.
const notices=new Map();
for(const input of Object.keys(result.metafile.inputs)){
 let dir=dirname(resolve(process.cwd(),input));
 while(dir!==dirname(dir)){
  const manifest=resolve(dir,'package.json');
  if(existsSync(manifest)){
   const pkg=JSON.parse(readFileSync(manifest,'utf8'));
   if(pkg.name){
    for(const license of ['LICENSE','LICENSE.md','LICENSE.txt'])if(existsSync(resolve(dir,license))){notices.set(pkg.name+'@'+pkg.version,readFileSync(resolve(dir,license),'utf8'));break;}
    break;
   }
  }
  dir=dirname(dir);
 }
}
writeFileSync(resolve(root,'vendor/supabase-NOTICES.txt'),[...notices.entries()].map(([name,license])=>name+'\n\n'+license).join('\n\n----------------------------------------\n\n')+'\n');
