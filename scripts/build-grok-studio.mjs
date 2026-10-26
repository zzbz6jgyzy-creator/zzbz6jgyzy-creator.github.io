#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const require = createRequire(import.meta.url);
const M = require('../grok-studio-model.js');
const V = require('../grok-studio-view.js');

export function buildGrokStudio(root = ROOT) {
  const read = p => fs.readFileSync(path.join(root, p), 'utf8');
  const d = M.validate(JSON.parse(read('data/grok-studio.json')));
  const articles = JSON.parse(read('data/articles.json'));
  const title = 'Grok & xAI — Field Guide, Tutorials, Models & Prompts | Supercharged Daily';
  const description = 'Explore Grok chat, voice, Imagine, Build and Bot. Follow 12 practical lessons, create useful prompts, compare sourced models and plans, and save your progress.';
  let html = read('grok.html').replace(/<main\b[\s\S]*?<\/main>/, () => V.build(d, articles));
  html = html.replace(/<title>[\s\S]*?<\/title>/, () => '<title>' + M.esc(title) + '</title>');
  html = html.replace(/(<meta\s+(?:name|property)="(?:description|og:description|twitter:description)"\s+content=")[^"]*/g, (_, start) => start + M.esc(description));
  html = html.replace(/(<meta\s+(?:name|property)="(?:og:title|twitter:title)"\s+content=")[^"]*/g, (_, start) => start + M.esc(title));
  html = html.replace(/<link[^>]+href="\/tesla-page\.css"[^>]*>/g, '<link rel="stylesheet" href="/grok-studio.css?v=20261026" />');
  if (!html.includes('href="/grok-studio.css')) throw Error('Missing Grok stylesheet link');
  const schema = {
    '@context': 'https://schema.org', '@type': 'CollectionPage',
    '@id': 'https://superchargeddaily.com/grok.html#page',
    url: 'https://superchargeddaily.com/grok.html', name: title, description,
    dateModified: d.checked,
    isPartOf: { '@type':'WebSite', name:'Supercharged Daily', url:'https://superchargeddaily.com/' },
    hasPart: d.lessons.map(l => ({
      '@type':'LearningResource', name:l.title, description:l.intro,
      learningResourceType:'Tutorial', educationalLevel:d.levels.find(x=>x.id===l.level).name,
      url:'https://superchargeddaily.com/grok.html#lesson-'+l.id
    }))
  };
  html = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, () => '<script type="application/ld+json">'+JSON.stringify(schema).replace(/</g,'\\u003c')+'</script>');
  fs.writeFileSync(path.join(root, 'grok.html'), html);

  const pages = JSON.parse(read('data/pages.json'));
  const own = p => /^\/grok\.html(?:#(?:capabilities|tutorial|prompt-studio|models|plans|latest|sources))?$/.test(p.url);
  const slot = pages.pages.findIndex(p => p.url === '/grok.html');
  pages.pages = pages.pages.filter(p => !own(p));
  const entries = [
    { url:'/grok.html', title:'Grok & xAI — Practical field guide', tag:'Grok', summary:description },
    ...[
      ['capabilities','Explore Grok capabilities','Understand chat and research, voice, Imagine, Build, Bot and the API with guided starting points.'],
      ['tutorial','Learn Grok — Twelve practical lessons','Follow four levels from your first useful request to code reviews, API workflows and reliable Bot routines.'],
      ['prompt-studio','Grok prompt studio','Create a clear brief from eight original examples, then copy it into your chosen Grok product.'],
      ['models','Compare Grok models and API costs','Explore sourced context windows and token rates with an uncached API cost planner.'],
      ['plans','Grok plans and subscription reference','Compare dated individual subscription prices, annual totals and Grok Bot eligibility.'],
      ['latest','Grok releases and original reporting','Read dated official product releases and Supercharged Daily Grok reporting.'],
      ['sources','Grok guide sources and boundaries','Find official documentation, snapshot dates and explanations of local saved progress.']
    ].map(([id, title, summary]) => ({ url:'/grok.html#'+id, title, tag:'Grok', summary }))
  ];
  pages.pages.splice(slot < 0 ? pages.pages.length : slot, 0, ...entries);
  fs.writeFileSync(path.join(root, 'data/pages.json'), JSON.stringify(pages, null, 2)+'\n');
  return d;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const d = buildGrokStudio();
  console.log('Grok guide built: '+d.products.length+' capabilities, '+d.lessons.length+' lessons, '+d.sources.length+' sources.');
}
