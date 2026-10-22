// Exercise the production return validator without booting Auth or making requests.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../members.js',import.meta.url),'utf8');
assert.match(source,/\nboot\(\);\s*$/);
const context=vm.createContext({});
vm.runInContext(source.replace(/\nboot\(\);\s*$/,''),context);
const validate=context.safeReturn;
const accepted=['/','/#main','/dispatch.html','/starship.html#lab','/roadster.html#gallery','/members.html','/dispatch/tesla-ai-maps-v15.html#comments','/reviews/index.html','/guides/tesla-buying-guide.html','/videos/falcon-9.html'];
const rejected=[null,{},'', 'starship.html','//evil.example','https://evil.example','https://superchargeddaily.com/starship.html','/\\evil.example','/%2f%2fevil.example','/%252f%252fevil.example','/x/../starship.html','/dispatch/../starship.html','/%2e%2e/starship.html','/starship.html%0a','/starship.html\n','/starship.html\r','/starship.html\t','/star\nship.html','/starship.html?return=//evil.example','/starship.html#%2f%2fevil.example','/starship.html#lab/../../','/members.js','/assets/test.html','/dispatch//test.html','/dispatch/%74est.html','/dispatch/test.html#comments\n'];
for(const path of accepted){
  assert.equal(validate(path),path,`Preserve ${JSON.stringify(path)}`);
  assert.equal(new URL(validate(path),'https://superchargeddaily.com').origin,'https://superchargeddaily.com');
}
for(const path of rejected)assert.equal(validate(path),'/',`Reject ${JSON.stringify(path)}`);
console.log(`Member return validation: ${accepted.length+rejected.length} cases passed.`);
