import {MOODS,localDay,validDay,migrateLegacy,normalizeStore,normalizeEntry,summary,recentDays,exportCSV} from "./core.mjs";
const STORE_KEY="mood_tracker_reflection_v2",LEGACY_KEY="moodLog";
const $=id=>document.getElementById(id);
const form=$("moodForm"),moodGrid=$("moodGrid"),tagGrid=$("tagGrid");
let entries=[],selectedMood=null,editingId=null,shown=20,storageWorks=true;
function safeRead(key){try{return localStorage.getItem(key);}catch{storageWorks=false;return null;}}
function showStatus(message,target="formStatus"){ $(target).textContent=message; }
function save(){
  try{localStorage.setItem(STORE_KEY,JSON.stringify({version:2,entries}));storageWorks=true;return true;}
  catch{storageWorks=false;showStatus("Browser storage is unavailable or full. Export a backup to keep your entries.","dataStatus");return false;}
}
function load(){
  const raw=safeRead(STORE_KEY);
  if(raw){
    try{const parsed=normalizeStore(JSON.parse(raw));if(parsed){entries=parsed.entries;return;}}
    catch{/* damaged local data should not crash the page */}
    showStatus("Saved journal data could not be read; you can import a backup.","dataStatus");
    return;
  }
  const old=safeRead(LEGACY_KEY);
  if(old){entries=migrateLegacy(old);
    if(entries.length)showStatus("Your earlier mood entries were carried forward with their original date text unchanged.","dataStatus");
  }
}
function node(tag,cls,text){
 const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=String(text);return e;
}
function labelFor(id){return MOODS.find(m=>m.id===id)||MOODS[2];}
function buildMoodChoices(){
 for(const mood of MOODS){
  const button=node("button","mood-choice");
  button.type="button";button.dataset.mood=mood.id;button.setAttribute("aria-pressed","false");
  button.setAttribute("aria-label","Choose "+mood.label);
  button.append(node("span","emoji",mood.emoji),node("span","",mood.label));
  button.addEventListener("click",()=>selectMood(mood.id));
  moodGrid.append(button);
  const option=document.createElement("option");option.value=mood.id;option.textContent=mood.label;$("moodFilter").append(option);
 }
}
function selectMood(id){
 selectedMood=id;
 moodGrid.querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.mood===id)));
 showStatus("");
}
function resetForm(){
 editingId=null;selectedMood=null;form.reset();
 moodGrid.querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed","false"));
 $("saveBtn").textContent="Save check-in ↗";$("stress").disabled=false;$("energy").disabled=false;
 showStatus("");$("note").value="";
}
function readTags(){return [...tagGrid.querySelectorAll("input:checked")].map(x=>x.value);}
function makeId(){return "m-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,10);}
function submit(event){
 event.preventDefault();
 if(!selectedMood){showStatus("Choose a mood first—there's no right answer.");moodGrid.querySelector("button")?.focus();return;}
 const note=$("note").value.trim().slice(0,1400),stress=$("stress").value,energy=$("energy").value,tags=readTags();
 if(editingId){
   const old=entries.find(e=>e.id===editingId);
   if(!old){resetForm();return;}
   const updated=normalizeEntry({...old,mood:selectedMood,note,tags,
      stress:old.legacy?null:stress,energy:old.legacy?null:energy});
   if(!updated){showStatus("Could not update this entry.");return;}
   entries=entries.map(e=>e.id===editingId?updated:e);
   resetForm();showStatus("Entry updated. Its original date was preserved.");
 }else{
   const now=new Date(),day=localDay(now);
   const candidate=normalizeEntry({id:makeId(),mood:selectedMood,day,dateLabel:day,
     recordedAt:now.toISOString(),stress,energy,note,tags,legacy:false});
   if(!candidate){showStatus("Couldn't save that check-in. Please try again.");return;}
   entries.push(candidate);
   resetForm();showStatus("Check-in saved to this browser. Thank you for taking a moment.");
 }
 save();shown=20;render();$("journalList").setAttribute("tabindex","-1");
}
function editEntry(id){
 const entry=entries.find(e=>e.id===id);if(!entry)return;
 editingId=id;form.reset();selectMood(entry.mood);
 $("note").value=entry.note;$("stress").value=entry.stress===null?"":String(entry.stress);
 $("energy").value=entry.energy===null?"":String(entry.energy);
 $("stress").disabled=entry.legacy;$("energy").disabled=entry.legacy;
 tagGrid.querySelectorAll("input").forEach(x=>x.checked=entry.tags.includes(x.value));
 $("saveBtn").textContent="Save changes ↗";
 showStatus("Editing "+entry.dateLabel+". The original date will not be changed.");
 $("checkin").scrollIntoView({behavior:"smooth"});$("note").focus();
}
function deleteEntry(id){
 const e=entries.find(x=>x.id===id);if(!e)return;
 if(!confirm("Delete this mood check-in from this browser? This cannot be undone."))return;
 entries=entries.filter(x=>x.id!==id);
 if(editingId===id)resetForm();
 save();render();showStatus("Entry deleted.","dataStatus");
}
function renderStats(){
 const s=summary(entries);
 $("totalCount").textContent=s.count;
 $("daysCount").textContent=s.uniqueDays;
 $("streakCount").textContent=s.streak;
 $("stressAvg").textContent=s.avgStress===null?"—":s.avgStress+" / 5";
 $("energyAvg").textContent=s.avgEnergy===null?"—":s.avgEnergy+" / 5";
 if(!entries.length){$("insightText").textContent="Start with one check-in. Your journal will grow at your own pace.";return;}
 const top=s.breakdown.slice().sort((a,b)=>b.count-a.count)[0];
 let text="You've recorded "+s.count+" check-in"+(s.count===1?"":"s")+". ";
 if(top&&top.count)text+="Your most-used mood label is “"+top.label+"” ("+top.count+"). ";
 if(s.legacyCount)text+=s.legacyCount+" earlier check-in"+(s.legacyCount===1?" has":"s have")+" its original date text preserved. ";
 text+="Only you can decide what these patterns mean.";
 $("insightText").textContent=text;
}
function renderDays(){
 const root=$("dayTrack");root.replaceChildren();
 const labelDate=day=>{const dt=new Date(day+"T12:00:00");return dt.toLocaleDateString("en-GB",{day:"numeric",month:"short"});};
 for(const item of recentDays(entries,localDay(),14)){
   const wrap=node("div","day-cell"),box=node("span","day-circle"+(item.count?" active":""),item.count?String(item.count):"·");
   box.setAttribute("aria-label",labelDate(item.day)+": "+item.count+" check-ins");
   wrap.append(box,node("span","",labelDate(item.day)));root.append(wrap);
 }
}
function renderMoodBars(){
 const root=$("moodBars");root.replaceChildren();
 const s=summary(entries),max=Math.max(1,...s.breakdown.map(b=>b.count));
 for(const b of s.breakdown){
   const row=node("div","bar-row"),label=node("span","bar-label",labelFor(b.id).emoji+" "+b.label),
    track=node("div","bar-track"),fill=node("div","bar-fill"),count=node("span","bar-count",b.count);
   fill.style.width=(b.count/max*100)+"%";track.append(fill);
   row.setAttribute("aria-label",b.label+": "+b.count+" check-ins");
   row.append(label,track,count);root.append(row);
 }
}
function journalItem(entry){
 const wrap=node("article","entry");const detail=node("div"),title=node("h3","",labelFor(entry.mood).emoji+" "+labelFor(entry.mood).label);
 const time=node("div","date-label",(entry.legacy?"Original entry · ":"")+entry.dateLabel);
 detail.append(title,time);
 const additional=[];
 if(entry.stress!==null)additional.push("Stress "+entry.stress+"/5");
 if(entry.energy!==null)additional.push("Energy "+entry.energy+"/5");
 if(entry.tags.length)additional.push(entry.tags.join(" · "));
 if(additional.length)detail.append(node("p","entry-context",additional.join("  ·  ")));
 if(entry.note)detail.append(node("p","entry-note",entry.note));
 const controls=node("div","entry-actions");
 const edit=node("button","","Edit");edit.type="button";edit.setAttribute("aria-label","Edit "+entry.mood+" check-in dated "+entry.dateLabel);edit.addEventListener("click",()=>editEntry(entry.id));
 const del=node("button","delete","Delete");del.type="button";del.setAttribute("aria-label","Delete check-in dated "+entry.dateLabel);del.addEventListener("click",()=>deleteEntry(entry.id));
 controls.append(edit,del);wrap.append(detail,controls);return wrap;
}
function renderJournal(){
 const root=$("journalList");root.replaceChildren();
 const selected=$("moodFilter").value;
 const data=entries.filter(e=>!selected||e.mood===selected).slice().reverse();
 if(!data.length){root.append(node("p","muted",selected?"No entries for this mood yet.":"No check-ins recorded yet. Start with one above."));return;}
 for(const e of data.slice(0,shown))root.append(journalItem(e));
 if(data.length>shown){
 const more=node("button","button button-outline","Show more entries ("+(data.length-shown)+" remaining)");
 more.type="button";more.addEventListener("click",()=>{shown+=20;renderJournal();});
 root.append(more);
 }
}
function render(){renderStats();renderDays();renderMoodBars();renderJournal();}
function download(filename,content,mime){
 const blob=new Blob([content],{type:mime}),url=URL.createObjectURL(blob);
 const a=document.createElement("a");a.href=url;a.download=filename;
 document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function exportBackup(){
 download("ultimate-mood-tracker-backup.json",JSON.stringify({version:2,entries},null,2),"application/json");
 showStatus("Backup downloaded. Keep it somewhere private.","dataStatus");
}
function exportTable(){
 download("ultimate-mood-tracker-history.csv","\ufeff"+exportCSV(entries),"text/csv;charset=utf-8");
 showStatus("Table downloaded. Remember: CSV contains your personal notes.","dataStatus");
}
async function importBackup(event){
 const file=event.target.files?.[0];event.target.value="";if(!file)return;
 if(file.size>2*1024*1024){showStatus("File too large; use a backup under 2 MB.","dataStatus");return;}
 let data;try{data=normalizeStore(JSON.parse(await file.text()));}catch{/* invalid JSON */}
 if(!data){showStatus("Invalid backup. Expected a Reflection Studio JSON file.","dataStatus");return;}
 if(!confirm("Replace the current journal with "+data.entries.length+" entries from this backup? Export your current entries first if needed."))return;
 entries=data.entries;resetForm();save();shown=20;render();
 showStatus("Backup imported. Original recorded dates were preserved.","dataStatus");
}
function clearAll(){
 if(!confirm("Permanently delete ALL mood entries saved in this browser, including records from the previous version? Export a backup first if you want to keep them."))return;
 try{localStorage.removeItem(STORE_KEY);localStorage.removeItem(LEGACY_KEY);}
 catch{showStatus("Browser storage could not be cleared.","dataStatus");return;}
 entries=[];resetForm();render();
 showStatus("All locally stored mood entries deleted.","dataStatus");
}
function init(){
 $("todayLabel").textContent="Today · "+new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"});
 buildMoodChoices();load();
 form.addEventListener("submit",submit);$("resetBtn").addEventListener("click",resetForm);
 $("moodFilter").addEventListener("change",()=>{shown=20;renderJournal();});
 $("exportJson").addEventListener("click",exportBackup);
 $("exportCSV").addEventListener("click",exportTable);
 $("importFile").addEventListener("change",importBackup);
 $("clearAll").addEventListener("click",clearAll);
 if(!storageWorks)showStatus("Local storage is blocked. Entries won't survive a reload—download a backup after recording.","dataStatus");
 render();
}
init();
