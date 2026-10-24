/* Account-scoped, revision-checked synchronization. No secrets or auth tokens are copied into preference data. */
(function(root){'use strict';
class PersonalSync{
 constructor({model,client,userId,getState,accept,status}){Object.assign(this,{model,client,userId,getState,accept,status});this.stopped=false;this.inflight=null;}
 stop(){this.stopped=true;}
 async owner(){if(this.stopped)throw Error('sync_stopped');const {data,error}=await this.client.auth.getUser();if(error||data.user?.id!==this.userId)throw Error('account_changed');}
 async rpc(name,args){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);try{const {data,error}=await this.client.rpc(name,args).abortSignal(controller.signal);if(error)throw error;if(this.stopped)throw Error('sync_stopped');return data;}finally{clearTimeout(timer);}}
 run(){if(this.inflight)return this.inflight;this.inflight=this.perform().finally(()=>{this.inflight=null;});return this.inflight;}
 async perform(){try{
  this.status('syncing');await this.owner();
  for(let attempt=0;attempt<3;attempt++){
   const remote=await this.rpc('sd_personal_home',{}),local=this.getState();if(!local||this.stopped)throw Error('sync_stopped');
   if(!Number.isSafeInteger(remote.revision)||remote.revision<0||remote.document!==null&&!this.model.valid(remote.document))throw Error('invalid_cloud_document');
   const combined=remote.document?this.model.merge(local.doc,remote.document):local.doc;
   if(remote.document&&this.model.equal(combined,remote.document)){
    this.accept(combined,remote.revision,false);this.status('synced');return;
   }
   await this.owner();
   try{
    const result=await this.rpc('sd_save_personal_home',{p_document:combined,p_revision:remote.revision});
    if(!this.model.valid(result.document)||!Number.isSafeInteger(result.revision)||result.revision<=remote.revision)throw Error('invalid_cloud_document');
    // Preserve changes made while the write was in flight; retry them rather than clearing their dirty flag.
    const latest=this.getState(),merged=this.model.merge(latest.doc,result.document),dirty=!this.model.equal(merged,result.document);
    this.accept(merged,result.revision,dirty);if(dirty)continue;this.status('synced');return;
   }catch(e){if(e.message==='revision_conflict')continue;throw e;}
  }
  throw Error('sync_conflict');
 }catch(error){if(!this.stopped)this.status(error.message==='account_changed'?'account-changed':error.code==='PGRST202'?'setup-needed':'offline',error);}
 }
}
root.SDPersonalSync=PersonalSync;if(typeof module==='object')module.exports=PersonalSync;
})(typeof window==='object'?window:globalThis);
