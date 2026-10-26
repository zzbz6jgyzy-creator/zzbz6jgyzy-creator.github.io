/* Uses Your Daily's existing document and revision-checked sync. No second reading list. */
((root)=>{'use strict';
 class ReadingList{
  constructor({model,storage,openClient,Sync,onChange=()=>{},onStatus=()=>{}}){Object.assign(this,{model,storage,openClient,Sync,onChange,onStatus});this.scope=null;this.sync=null;this.client=null;this.busy=null;this.state=this.read(null)||this.fresh();this.connected=false;this.epoch=0;}
  fresh(){return {doc:this.model.blank(),revision:0,dirty:false,completed:false,lastVisit:''};}
  get(key){try{return this.storage.getItem(key);}catch{return null;}}
  read(id){return this.model.read(this.storage,id);}
  changed(){this.onChange(this.state.doc.saved,this.scope);}
  device(message){this.epoch++;this.sync?.stop();this.sync=null;this.scope=null;this.connected=false;this.state=this.read(null)||this.fresh();this.changed();if(message)this.onStatus(message);}
  initialize(){if(this.busy)return this.busy;this.busy=(async()=>{const expected=this.get('sd-personal-sync-account-v1');if(!/^[a-f0-9-]{36}$/.test(expected||'')||!this.get('sd-members-auth')){this.changed();return;}
   try{const client=await this.openClient();const{data,error}=await client.auth.getUser();if(error||data.user?.id!==expected){this.device('Using the device reading list. Connect your current account from Your Daily.');return;}
    const epoch=this.epoch;client.auth.onAuthStateChange((event,session)=>{if(!['INITIAL_SESSION','TOKEN_REFRESHED'].includes(event)&&session?.user?.id!==expected)this.device('Account changed. You’re viewing the separate device reading list.');});
    const{data:cloud,error:err}=await client.rpc('sd_personal_home',{});if(epoch!==this.epoch)return;if(err||!cloud||!Number.isSafeInteger(cloud.revision)||cloud.revision<0||cloud.document!==null&&!this.model.valid(cloud.document))throw Error('cloud_unavailable');
    const own=this.read(expected),doc=own?.doc&&cloud.document?this.model.merge(own.doc,cloud.document):own?.doc||cloud.document||this.model.blank();
    this.client=client;this.scope=expected;this.connected=true;this.state={...(own||this.fresh()),doc,revision:cloud.revision,dirty:own?.dirty===true,completed:own?.completed===true||!!cloud.document};this.model.write(this.storage,expected,this.state);
    this.changed();
   }catch{this.device('Account reading list unavailable. Saves use the separate device list; open Your Daily to reconnect.');}
  })();return this.busy;}
  async toggle(url){await this.initialize();if(!this.model.route(url))throw Error('invalid_record');const other=this.read(this.scope);const doc=other?this.model.merge(this.state.doc,other.doc):this.state.doc,value=!doc.saved[url]?.value;
   const next=this.model.mark(doc,'saved',url,value);this.state={...this.state,doc:next,dirty:true,completed:true};const stored=this.model.write(this.storage,this.scope,this.state);this.changed();
   this.onStatus(stored?(value?'Saved to your '+(this.scope?'account reading list on this device. Syncing…':'device reading list in Your Daily.'):'Removed from your reading list.'):'Changed for this visit. Browser storage is unavailable, so this change cannot be kept after you leave.');
   if(this.scope&&stored)this.runSync();return {value,stored};
  }
  runSync(){if(!this.scope||!this.Sync)return;const id=this.scope;this.sync?.stop();this.sync=new this.Sync({model:this.model,client:this.client,userId:id,getState:()=>this.scope===id?this.state:null,accept:(doc,revision,dirty)=>{if(this.scope!==id)return;this.state={...this.state,doc,revision,dirty};this.model.write(this.storage,id,this.state);this.changed();},status:kind=>{if(this.scope!==id)return;if(kind==='account-changed'){this.device('Account changed. You’re viewing the separate device reading list.');return;}if(kind==='synced')this.onStatus('Reading list saved to your account.');if(['offline','setup-needed'].includes(kind))this.onStatus('Saved on this device. Account sync is pending; Your Daily can retry it.');}});this.sync.run();}
  storageChanged(key){if(key!==this.model.key(this.scope))return;const other=this.read(this.scope);if(!other)return;try{this.state={...this.state,doc:this.model.merge(this.state.doc,other.doc),revision:Math.max(this.state.revision,other.revision),dirty:this.state.dirty||other.dirty};this.changed();}catch{}}
 }
 if(typeof module==='object'&&module.exports)module.exports=ReadingList;else root.SDNewsReadingList=ReadingList;
})(typeof window==='object'?window:globalThis);
