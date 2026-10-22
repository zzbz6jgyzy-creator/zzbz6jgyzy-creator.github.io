// Supercharged Daily membership. Public configuration only; authorization lives in PostgreSQL.
const CONFIG = '/members-config.json';
const API_TIMEOUT = 12000;
const ARTICLE = /^\/dispatch\/[a-z0-9]+(?:-[a-z0-9]+)*\.html$/;
const messages = {
  sign_in_required: 'Please sign in again.', account_blocked: 'Commenting is unavailable for this account. Contact the editor if you need help.',
  profile_required: 'Choose a display name and accept the community rules in your member account first.',
  rules_required: 'Please accept the community rules.', invalid_name: 'Use 2–40 characters for your display name, without an email address or HTML.',
  name_taken: 'That display name is taken. Please choose another.', invalid_comment: 'Write between 1 and 3,000 characters.',
  post_rate_limit: 'Please wait 20 seconds between comments.', daily_post_limit: 'You’ve reached today’s limit of 30 comments. Please try tomorrow.',
  vote_rate_limit: 'Please wait a moment before changing another thumbs-up.', daily_vote_limit: 'You’ve reached today’s reaction limit.',
  invalid_reply: 'This comment is no longer available for replies.', comment_not_found: 'This comment is no longer available.',
  report_rate_limit: 'You’ve reached today’s report limit.', invalid_report: 'Choose a reason and keep the details under 500 characters.',
  not_allowed: 'Your account cannot perform this action.', invalid_request: 'Please refresh the page and try again.'
};
function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value == null || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value === true ? '' : String(value));
  }
  for (const child of children.flat()) if (child != null) node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  return node;
}
function thumb() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  for (const [k,v] of Object.entries({viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':'1.8','stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true'})) svg.setAttribute(k,v);
  const path = document.createElementNS(svg.namespaceURI,'path');
  path.setAttribute('d','M7 10H3v11h4m0-11 5-8a3 3 0 0 1 2 4l-1 4h6a2 2 0 0 1 2 2l-2 7a3 3 0 0 1-3 2H7V10Z');svg.append(path);return svg;
}
function status(node, text, error = false) { node.textContent = text; node.classList.toggle('sdm-error', error); }
function errorText(error) {
  return messages[error?.message] || (error?.name === 'AbortError' || /timeout|abort/i.test(error?.message || '')
    ? 'This is taking too long. Your text is still here; please try again.' : 'We couldn’t complete that request. Please try again.');
}
function safeReturn(value) {
  // Validate the literal static-page route before a URL parser can normalize it.
  // No encoding, queries, traversal, controls or protocol-relative destinations.
  if(typeof value!=='string'||value!==value.trim())return '/';
  return /^(?:\/|\/(?:[a-z0-9]+(?:-[a-z0-9]+)*\.html|(?:dispatch|guides|reviews|videos)\/[a-z0-9]+(?:-[a-z0-9]+)*\.html))(?:#[A-Za-z][A-Za-z0-9_-]*)?$/.test(value) ? value : '/';
}
function accountLink(label = 'Sign in to comment') {
  return el('a',{href:'/members.html?return='+encodeURIComponent(safeReturn(location.pathname + (ARTICLE.test(location.pathname) ? '#comments' : ''))),class:'sdm-button'},label);
}
function dateLabel(value) { const d = new Date(value); return Number.isNaN(d.getTime()) ? '' : d.toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'}); }
async function boundedFetch(url, options={}) {
  const c = new AbortController(), timer=setTimeout(()=>c.abort(),API_TIMEOUT);
  const abort=()=>c.abort(); options.signal?.addEventListener('abort',abort,{once:true});
  if(options.signal?.aborted)c.abort();
  try{return await fetch(url,{...options,signal:c.signal});} finally {clearTimeout(timer);options.signal?.removeEventListener('abort',abort);}
}

let client, user=null, profile=null, refreshThread=async()=>{};
async function rpc(name, args={}) {
  const c=new AbortController(), timer=setTimeout(()=>c.abort(),API_TIMEOUT);
  try { const {data,error}=await client.rpc(name,args).abortSignal(c.signal);if(error)throw error;return data; } finally {clearTimeout(timer);}
}
async function busy(button, action, target) {
  const original=button.textContent;button.disabled=true;button.setAttribute('aria-busy','true');
  try { await action(); } catch(e) {status(target,errorText(e),true);} finally {button.disabled=false;button.removeAttribute('aria-busy');if(!button.textContent)button.textContent=original;}
}
function canParticipate(target) {
  if(!user){status(target,'Sign in to join the discussion.');return false;}
  if(!profile?.accepted || !profile?.display_name){status(target,messages.profile_required);return false;}
  if(profile.blocked){status(target,messages.account_blocked,true);return false;}return true;
}
async function signIn(target, button) {
  await busy(button,async()=>{
    const ret=safeReturn(new URLSearchParams(location.search).get('return') || location.pathname+'#comments');
    sessionStorage.setItem('sd-member-return',ret);
    const {error}=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin+'/members.html',scopes:'openid email profile'}});
    if(error)throw error;
  },target);
}
function installNav() {
  const href='/members.html?return='+encodeURIComponent(safeReturn(location.pathname+(ARTICLE.test(location.pathname)?'#comments':location.hash)));
  const items=document.querySelector('.pn-items'),sheet=document.querySelector('.pn-sheet'),explore=document.querySelector('#pn-ex');
  if(items&&!items.querySelector('.sdm-nav-primary')){
    const link=el('a',{href,class:'pn-link sdm-nav sdm-nav-primary','data-member-nav':true},'Members');
    items.insertBefore(link,items.querySelector(':scope > .pn-cta'));
  }
  if(sheet&&!sheet.querySelector('[data-member-nav]'))sheet.querySelector('.pn-sheet-head')?.after(el('a',{href,class:'sdm-nav','data-member-nav':true},'Members · Sign in'));
  if(explore&&!explore.querySelector('[data-member-nav]'))explore.append(el('a',{href,class:'sdm-nav','data-member-nav':true},'Members',el('small',{},'Sign in, profile and discussions')));
  window.dispatchEvent(new Event('resize'));
}

function voteButton(article, id, data, target) {
  const count=el('span',{},data.likes||0), button=el('button',{type:'button',class:'sdm-vote','aria-pressed':String(!!data.liked),'aria-label':id?'Thumbs up this comment':'Thumbs up this article'},thumb(),count);
  button.addEventListener('click',()=>{
    if(!canParticipate(target))return;
    const active=button.getAttribute('aria-pressed')!=='true';
    busy(button,async()=>{const r=await rpc('sd_vote',{p_article:article,p_active:active,p_comment:id});button.setAttribute('aria-pressed',String(r.liked));count.textContent=r.likes;status(target,r.liked?'Thumbs-up added.':'Thumbs-up removed.');},target);
  });return button;
}
function composer(article, parent, afterSave) {
  const fieldId='sd-comment-'+(parent||'root'), target=el('p',{class:'sdm-status',role:'status','aria-live':'polite'});
  if(!user)return el('div',{class:'sdm-signin'},el('p',{},'Have something to add? Sign in to join the discussion.'),accountLink(),target);
  if(profile?.blocked)return el('div',{class:'sdm-note'},messages.account_blocked);
  if(!profile?.accepted || !profile.display_name)return el('div',{class:'sdm-signin'},el('p',{},'Choose your public display name before joining in.'),accountLink('Set up your member profile'));
  const field=el('textarea',{id:fieldId,name:'comment',rows:4,maxlength:3000,required:true,placeholder:parent?'Write a reply…':'Add your perspective…'});
  const submit=el('button',{type:'submit',class:'sdm-button'},parent?'Submit reply':'Submit comment');
  const counter=el('span',{class:'sdm-counter'},'0 / 3,000');let nonce=crypto.randomUUID();
  field.addEventListener('input',()=>{counter.textContent=field.value.length.toLocaleString()+' / 3,000';nonce=crypto.randomUUID();});
  const form=el('form',{class:'sdm-composer'},el('label',{for:fieldId},parent?'Your reply':'Your comment'),field,
    el('div',{class:'sdm-composer-foot'},el('span',{class:'sdm-muted'},'Posting as '+profile.display_name),counter),
    el('p',{class:'sdm-fine'},'Comments publish immediately. ',el('a',{href:'/community.html'},'Community rules & privacy')),submit,target);
  form.addEventListener('submit',e=>{e.preventDefault();if(!form.reportValidity())return;busy(submit,async()=>{
    const result=await rpc('sd_post_comment',{p_article:article,p_body:field.value,p_nonce:nonce,p_parent:parent});
    field.value='';counter.textContent='0 / 3,000';nonce=crypto.randomUUID();
    status(target,'Your comment is published.');
    try{await afterSave(result);}catch{status(target,'Your comment was saved. Refresh the discussion to see it.');}
  },target);});return form;
}
function reportDialog(id,target){
  if(!canParticipate(target))return;
  const local=el('p',{class:'sdm-status',role:'status'}),reason=el('select',{id:'sd-report-reason',required:true},el('option',{value:'spam'},'Spam'),el('option',{value:'abuse'},'Abuse or harassment'),el('option',{value:'other'},'Other concern'));
  const detail=el('textarea',{id:'sd-report-details',maxlength:500,rows:3}),send=el('button',{type:'submit',class:'sdm-button'},'Send report');
  const dialog=el('dialog',{class:'sdm-dialog','aria-labelledby':'sd-report-title'}),form=el('form',{},el('h2',{id:'sd-report-title'},'Report this comment'),el('label',{for:reason.id},'Reason'),reason,el('label',{for:detail.id},'Details (optional)'),detail,local,
    el('div',{class:'sdm-actions'},send,el('button',{type:'button',class:'sdm-button sdm-secondary',onclick:()=>dialog.close()},'Cancel')));
  form.addEventListener('submit',e=>{e.preventDefault();busy(send,async()=>{await rpc('sd_report_comment',{p_id:id,p_reason:reason.value,p_details:detail.value});dialog.close();status(target,'Report sent to the editor. Thank you.');},local);});
  dialog.append(form);dialog.addEventListener('close',()=>dialog.remove(),{once:true});document.body.append(dialog);dialog.showModal();
}
function commentNode(article,c,target,updateSummary){
  const node=el('li',{class:'sdm-comment',id:'comment-'+c.id}),actions=el('div',{class:'sdm-actions'});
  let loadReplies;
  const author=el('strong',{},c.status==='deleted'?'Removed comment':c.name||'Former member');
  const time=el('time',{datetime:c.created_at},dateLabel(c.created_at));
  node.append(el('header',{class:'sdm-comment-head'},author,c.moderator?el('span',{class:'sdm-badge'},'Editor'):null,time));
  node.append(el('p',{class:'sdm-comment-body'},c.status==='deleted'?'This comment was removed.':c.body));
  if(c.status==='published'){
    actions.append(voteButton(article,c.id,c,target));
    if(!c.parent_id){
      const area=el('div',{class:'sdm-reply-form',hidden:true}),reply=el('button',{type:'button',class:'sdm-text-button','aria-expanded':'false','aria-controls':'reply-form-'+c.id},'Reply');area.id='reply-form-'+c.id;
      reply.addEventListener('click',()=>{if(!canParticipate(target))return;area.hidden=!area.hidden;reply.setAttribute('aria-expanded',String(!area.hidden));if(!area.hidden){area.replaceChildren(composer(article,c.id,async(result)=>{await loadReplies({reset:true,focusId:result.id});status(target,'Your reply is published.');}));area.querySelector('textarea')?.focus();}});
      actions.append(reply);node.append(area);
    }
    if(!c.own)actions.append(el('button',{type:'button',class:'sdm-text-button',onclick:()=>reportDialog(c.id,target)},'Report'));
  }
  if(profile?.moderator&&!c.own&&c.status==='published'){
    for(const [action,label] of [['remove','Remove comment'],['block','Block account']]){
      let confirmed=false;const control=el('button',{type:'button',class:'sdm-text-button'},label);
      control.addEventListener('click',()=>{if(!confirmed){confirmed=true;control.textContent='Confirm '+label.toLowerCase();return;}busy(control,async()=>{await rpc('sd_moderate',{p_id:c.id,p_action:action});await refreshThread();status(target,'Moderation saved.');},target);});actions.append(control);
    }
  }
  if(c.own&&c.status!=='deleted'){
    let confirmed=false;const remove=el('button',{type:'button',class:'sdm-text-button'},'Delete');
    remove.addEventListener('click',()=>{if(!confirmed){confirmed=true;remove.textContent='Confirm delete';return;}busy(remove,async()=>{await rpc('sd_delete_comment',{p_id:c.id});await refreshThread();status(target,'Your comment was removed.');},target);});actions.append(remove);
  }
  node.append(actions);
  if(!c.parent_id){
    const children=el('ol',{class:'sdm-replies',id:'replies-'+c.id,hidden:true}),more=el('button',{type:'button',class:'sdm-text-button',hidden:c.replies===0,'aria-expanded':'false','aria-controls':children.id},'View replies ('+c.replies+')');let before=null;
    loadReplies=async({reset=false,focusId=null}={})=>{
      // Anchor a saved reply's page to its ID, even if newer replies arrive meanwhile.
      const cursor=focusId?String(BigInt(focusId)+1n):reset?null:before;
      const data=await rpc('sd_comments',{p_article:article,p_parent:c.id,p_before:cursor,p_limit:10});
      if(reset)children.replaceChildren();
      for(const row of data.items)children.append(commentNode(article,row,target,updateSummary));before=data.next;children.hidden=false;
      more.setAttribute('aria-expanded','true');more.textContent=before?'More replies':'All replies shown';more.hidden=!before;
      updateSummary(data);
      if(focusId){const published=children.querySelector('#comment-'+CSS.escape(String(focusId)));if(published){published.tabIndex=-1;published.focus({preventScroll:true});published.scrollIntoView({block:'center'});}}
    };
    more.addEventListener('click',()=>busy(more,()=>loadReplies(),target));node.append(more,children);
  }return node;
}
async function startThread(article,root){
  const target=el('p',{class:'sdm-status',role:'status','aria-live':'polite'}),list=el('ol',{class:'sdm-comments-list'}),reaction=el('div',{class:'sdm-article-reaction'}),forms=el('div');
  const count=el('span',{class:'sdm-muted'}),more=el('button',{type:'button',class:'sdm-button sdm-secondary'},'Load more comments');let before=null,revision=0;
  const refresh=el('button',{type:'button',class:'sdm-text-button'},'Refresh discussion');
  root.replaceChildren(reaction,el('div',{class:'sdm-discussion-head'},el('h2',{id:'sd-comments-title'},'Join the discussion'),count),el('p',{class:'sdm-muted'},'Be curious. Be constructive. Comments publish immediately; report anything that breaks the community rules.'),forms,target,refresh,list,more);
  forms.append(composer(article,null,()=>load(true)));
  function updateSummary(data){
    count.textContent=data.count+' published '+(data.count===1?'comment':'comments');
    reaction.replaceChildren(el('span',{},'Enjoyed this article?'),voteButton(article,null,data,target));
  }
  async function load(reset=false){
    const version=++revision;more.disabled=true;
    try{
      const data=await rpc('sd_comments',{p_article:article,p_parent:null,p_before:reset?null:before,p_limit:20});if(version!==revision)return;
      if(reset)list.replaceChildren();
      const existing=new Set([...list.children].map(e=>e.id));for(const c of data.items)if(!existing.has('comment-'+c.id))list.append(commentNode(article,c,target,updateSummary));
      before=data.next;more.hidden=!before;updateSummary(data);
      if(!list.children.length)list.append(el('li',{class:'sdm-empty'},'No comments yet. Start the conversation.'));
      status(target,'');
    }finally{more.disabled=false;}
  }
  refreshThread=()=>load(true);
  refresh.addEventListener('click',()=>busy(refresh,()=>load(true),target));more.addEventListener('click',()=>busy(more,()=>load(),target));
  try{await load(true);}catch(e){more.hidden=true;status(target,'The discussion couldn’t load. You can still read the article. Try “Refresh discussion”.',true);}
}
async function moderation(root){
  const target=el('p',{class:'sdm-status',role:'status'}),queue=el('ol',{class:'sdm-comments-list'}),mode=el('select',{id:'sd-mod-mode'},el('option',{value:'recent'},'Recent comments'),el('option',{value:'reported'},'Reported comments'));
  const refresh=el('button',{type:'button',class:'sdm-button sdm-secondary'},'Refresh queue');
  root.replaceChildren(el('h2',{},'Editor moderation'),el('p',{class:'sdm-muted'},'The 50 most recent comments, or reader reports. Remove comments or block an account when needed.'),el('label',{for:mode.id},'Review'),mode,refresh,target,queue);
  async function load(){const items=await rpc('sd_moderation_queue',{p_mode:mode.value});queue.replaceChildren();
    for(const c of items){
      const actions=el('div',{class:'sdm-actions'}),node=el('li',{class:'sdm-comment'},el('strong',{},c.name),el('p',{},el('a',{href:safeReturn(c.article)+'#comments'},c.article.split('/').pop().replace('.html','').replaceAll('-',' '))),el('p',{class:'sdm-comment-body'},c.body));
      if(c.reports?.length)node.append(el('ul',{class:'sdm-reports'},...c.reports.map(r=>el('li',{},r.reason+(r.details?': '+r.details:'')))));
      for(const [action,label] of (mode.value==='recent'?[['remove','Remove comment'],['block','Block account']]:[['dismiss','Dismiss report'],['remove','Remove comment'],['block','Block account']])){
        let confirmed=false;const button=el('button',{type:'button',class:'sdm-button sdm-secondary'},label);
        button.addEventListener('click',()=>{if(action==='block'&&!confirmed){confirmed=true;button.textContent='Confirm block account';return;}busy(button,async()=>{await rpc('sd_moderate',{p_id:c.id,p_action:action});await load();status(target,'Moderation saved.');},target);});actions.append(button);
      }node.append(actions);queue.append(node);
    }if(!items.length)queue.append(el('li',{class:'sdm-empty'},'You’re all caught up.'));
  }
  refresh.addEventListener('click',()=>busy(refresh,load,target));mode.addEventListener('change',()=>busy(refresh,load,target));
  try{await load();}catch(e){status(target,errorText(e),true);}
}
function renderAccount(root,saved=false){
  const target=el('p',{class:'sdm-status',role:'status','aria-live':'polite'}),ret=safeReturn(new URLSearchParams(location.search).get('return') || sessionStorage.getItem('sd-member-return') || '/');
  const back=el('a',{href:ret,class:'sdm-text-button'},ret==='/'?'Back to the homepage →':ARTICLE.test(ret.split('#')[0])?'Return to the article →':'Return to the page →');root.replaceChildren();
  if(!user){
    const google=el('button',{type:'button',class:'sdm-button sdm-google'},'Continue with Google');google.addEventListener('click',()=>signIn(target,google));
    root.append(el('h2',{},'A place for your perspective'),el('p',{},'Create your free member account or sign in to comment, reply and give a thumbs-up.'),google,
      el('p',{class:'sdm-fine'},'Google handles sign-in. Your email stays private; you choose the name shown with comments. ',el('a',{href:'/community.html'},'Community rules & privacy')),
      el('p',{class:'sdm-fine'},'Membership doesn’t subscribe you to the newsletter.'),target,back);return;
  }
  const signout=el('button',{type:'button',class:'sdm-button sdm-secondary'},'Sign out');signout.addEventListener('click',()=>busy(signout,async()=>{const {error}=await client.auth.signOut({scope:'local'});if(error)throw error;sessionStorage.removeItem('sd-member-return');},target));
  if(profile?.blocked){root.append(el('p',{},messages.account_blocked),el('a',{href:'mailto:superchargeddaily@gmail.com'},'Contact the editor'),signout,target);return;}
  const confirmation=saved?el('div',{class:'sdm-profile-success',role:'status','aria-live':'polite',tabindex:'-1'},
    el('span',{class:'sdm-success-mark','aria-hidden':true},'✓'),el('div',{},el('strong',{},'Your profile is saved'),el('p',{},'You can now comment and give thumbs-up.'))):null;
  const name=el('input',{id:'sd-member-name',name:'display_name',type:'text',required:true,minlength:2,maxlength:40,autocomplete:'nickname',value:profile?.display_name||''});
  const accept=el('input',{id:'sd-member-rules',name:'rules',type:'checkbox',required:true});accept.checked=!!profile?.accepted;
  target.id='sd-profile-status';
  name.addEventListener('input',()=>confirmation?.remove());accept.addEventListener('change',()=>confirmation?.remove());
  const save=el('button',{type:'submit',class:'sdm-button'},'Save profile'),form=el('form',{class:'sdm-profile'},el('label',{for:name.id},'Public display name'),name,
    el('p',{class:'sdm-fine'},'Use a nickname rather than your email address. This name appears beside your comments.'),
    el('label',{class:'sdm-check',for:accept.id},accept,el('span',{},'I agree to the ',el('a',{href:'/community.html'},'community rules and privacy information'),'.')),target,save);
  form.addEventListener('invalid',()=>status(target,name.validity.valid?messages.rules_required:messages.invalid_name,true),true);
  form.addEventListener('submit',e=>{e.preventDefault();if(!form.reportValidity())return;busy(save,async()=>{
    confirmation?.remove();save.textContent='Saving…';status(target,'Saving your profile…');
    try{profile=await rpc('sd_set_profile',{p_name:name.value,p_accept:accept.checked});renderAccount(root,true);}
    finally{save.textContent='Save profile';}
  },target);});
  if(confirmation)root.append(confirmation);
  root.append(el('h2',{},profile?.display_name?'Your member profile':'Choose how you appear'),form,el('div',{class:'sdm-actions'},signout,back));
  if(confirmation)requestAnimationFrame(()=>{if(confirmation.isConnected){confirmation.focus({preventScroll:true});confirmation.scrollIntoView({block:'center'});}});
  if(profile?.moderator){const mod=el('section',{class:'sdm-moderation'});root.append(mod);moderation(mod);}
}
async function boot(){
  const account=document.querySelector('[data-members-account]');let config;
  try{const response=await boundedFetch(CONFIG,{cache:'no-cache'});if(!response.ok)throw Error();config=await response.json();}
  catch{if(account)account.replaceChildren(el('p',{},'Member sign-in couldn’t load. Please refresh and try again.'));return;}
  if(config.enabled!==true){if(account)account.replaceChildren(el('p',{},'Member sign-in opens soon. In the meantime, enjoy the latest stories.'),el('a',{href:'/dispatch.html',class:'sdm-button'},'Read Dispatch'));return;}
  if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(config.url||'')||!/^sb_publishable_[A-Za-z0-9_-]+$/.test(config.publishableKey||'')){
    if(account)account.replaceChildren(el('p',{},'Member sign-in is temporarily unavailable. Please try again later.'));return;
  }
  installNav();
  const article=ARTICLE.test(location.pathname)&&(config.articles==='all'||Array.isArray(config.articles)&&config.articles.includes(location.pathname))?document.querySelector('main article.article'):null;
  if(!account&&!article)return;
  let root;
  if(article){root=el('section',{class:'sdm-discussion',id:'comments','aria-labelledby':'sd-comments-title'},el('h2',{id:'sd-comments-title'},'Join the discussion'),el('p',{},'Loading the conversation…'));article.append(root);}
  async function initialize(){
    try{
      const {createClient}=await import('/vendor/supabase-2.118.0.js');
      client=createClient(config.url,config.publishableKey,{auth:{flowType:'pkce',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:'sd-members-auth'},global:{fetch:boundedFetch}});
      const {data,error}=await client.auth.getSession();if(error)throw error;user=data.session?.user||null;
      if(user)profile=await rpc('sd_member_profile');
      const params=new URLSearchParams(location.search);if(params.has('code')||params.has('error')){
        const failed=params.has('error');for(const key of ['code','error','error_code','error_description'])params.delete(key);
        history.replaceState(null,'',location.pathname+(params.size?'?'+params:'')+location.hash);
        if(failed&&!user)throw Error('sign_in_required');
      }
      if(account)renderAccount(account);if(root)await startThread(location.pathname,root);
      client.auth.onAuthStateChange((event,session)=>{
        if(event==='INITIAL_SESSION'||event==='TOKEN_REFRESHED')return;
        setTimeout(async()=>{try{user=session?.user||null;profile=user?await rpc('sd_member_profile'):null;if(account)renderAccount(account);if(root)await startThread(location.pathname,root);}catch{location.reload();}},0);
      });
    }catch(e){const target=account||root;if(target)target.replaceChildren(el('p',{class:'sdm-status sdm-error',role:'status'},errorText(e)),el('a',{href:location.pathname+location.search,class:'sdm-button sdm-secondary'},'Try again'));}
  }
  if(root&&!account&&'IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){observer.disconnect();initialize();}},{rootMargin:'600px'});observer.observe(root);}else await initialize();
}
boot();
