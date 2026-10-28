/* Ultimate Mood Tracker — Reflection Studio. Original creator: Cornelius Aurelius.
   Pure, dependency-free records and reporting engine. No medical inference. */
export const MOODS = Object.freeze([
  {id:"happy",label:"Happy",emoji:"😄"}, {id:"calm",label:"Calm",emoji:"🙂"},
  {id:"neutral",label:"Neutral",emoji:"😐"}, {id:"confused",label:"Uncertain",emoji:"😕"},
  {id:"sad",label:"Sad",emoji:"😔"}, {id:"angry",label:"Angry",emoji:"😠"},
  {id:"stressed",label:"Stressed",emoji:"😫"}, {id:"low",label:"Low energy",emoji:"😞"},
  {id:"excited",label:"Excited",emoji:"🤩"}
]);
export const VALID_MOODS = new Set(MOODS.map(m=>m.id));
export function localDay(date=new Date()) {
  return [date.getFullYear(),String(date.getMonth()+1).padStart(2,"0"),String(date.getDate()).padStart(2,"0")].join("-");
}
export function validDay(value) {
  if(typeof value!=="string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y,m,d]=value.split("-").map(Number);
  const chk=new Date(y,m-1,d);
  return chk.getFullYear()===y && chk.getMonth()+1===m && chk.getDate()===d;
}
export function cleanText(value,max=1400) {return typeof value==="string"?value.trim().slice(0,max):"";}
export function rating(value) {return value===null || value==="" || value===undefined?null:(Number.isInteger(+value)&&+value>=1&&+value<=5?+value:null);}
export function normalizeEntry(entry,index=0) {
  if(!entry || typeof entry!=="object" || !VALID_MOODS.has(entry.mood)) return null;
  const legacy=Boolean(entry.legacy);
  const day=legacy?null:(validDay(entry.day)?entry.day:null);
  if(!legacy && !day) return null;
  // Preserve exact historical strings (including locale-specific date formatting).
  const dateLabel=cleanText(entry.dateLabel,90)||(day||"");
  return {
    id:cleanText(entry.id,100)||("entry-"+index),mood:entry.mood,day,
    dateLabel,recordedAt:cleanText(entry.recordedAt,50),
    stress:legacy?null:rating(entry.stress),energy:legacy?null:rating(entry.energy),
    note:cleanText(entry.note),tags:Array.isArray(entry.tags)?entry.tags.filter(x=>typeof x==="string").slice(0,8).map(x=>cleanText(x,35)):[],
    legacy
  };
}
export function migrateLegacy(raw) {
  let list;try{list=typeof raw==="string"?JSON.parse(raw):raw;}catch{return [];}
  if(!Array.isArray(list)) return [];
  return list.slice(0,5000).map((entry,i)=> {
    if(!entry||!VALID_MOODS.has(entry.m))return null;
    return normalizeEntry({id:"legacy-"+i,mood:entry.m,legacy:true,dateLabel:typeof entry.date==="string"?entry.date:"Original date unavailable"},i);
  }).filter(Boolean);
}
export function normalizeStore(data) {
  if(!data || data.version!==2 || !Array.isArray(data.entries)) return null;
  const seen=new Set(),entries=[];
  for(const item of data.entries.slice(0,5000)){
    let record=normalizeEntry(item,entries.length); if(!record) continue;
    if(seen.has(record.id)) continue;seen.add(record.id);entries.push(record);
  }
  return {version:2,entries};
}
export function addEntry(entries,entry) {
  const item=normalizeEntry(entry,entries.length);
  if(!item || entries.some(x=>x.id===item.id)) return entries.slice();
  return [...entries,item];
}
export function removeEntry(entries,id) {return entries.filter(x=>x.id!==id);}
export function summary(entries,today=localDay()) {
  const breakdown=MOODS.map(m=>({id:m.id,label:m.label,count:entries.filter(x=>x.mood===m.id).length}));
  const dated=entries.filter(x=>x.day && validDay(x.day) && x.day<=today);
  const recent=new Set(dated.map(x=>x.day));
  let cursor=new Date(today+"T12:00:00");
  let streak=0;
  // No judgement for missing a check-in; today is optional until midnight.
  if(!recent.has(today))cursor.setDate(cursor.getDate()-1);
  for(let i=0;i<3650;i++){
    const day=localDay(cursor);if(!recent.has(day))break;
    streak++;cursor.setDate(cursor.getDate()-1);
  }
  const vals=entries.filter(x=>x.stress!==null&&x.stress!==undefined);
  const avg=a=>a.length?+(a.reduce((s,v)=>s+v,0)/a.length).toFixed(1):null;
  const dayCounts=[...recent].sort();
  return {count:entries.length,uniqueDays:dayCounts.length,streak,breakdown,
    latest:entries.length?entries[entries.length-1]:null,
    avgStress:avg(vals.map(x=>x.stress).filter(x=>x!==null)),
    avgEnergy:avg(entries.map(x=>x.energy).filter(x=>x!==null && x!==undefined)),
    legacyCount:entries.filter(x=>x.legacy).length};
}
export function recentDays(entries,today=localDay(),days=14) {
  const end=new Date(today+"T12:00:00"),result=[];
  for(let i=days-1;i>=0;i--){
    const d=new Date(end);d.setDate(d.getDate()-i);const day=localDay(d);
    const dayEntries=entries.filter(x=>x.day===day);
    result.push({day,count:dayEntries.length,mood:dayEntries.at(-1)?.mood||null});
  }
  return result;
}
export function exportCSV(entries) {
  const q=x=>'"'+String(x??"").replace(/"/g,'""')+'"';
  const cols=["id","dateLabel","day","mood","stress","energy","note","tags","legacy"];
  return [cols.join(","),...entries.map(r=>cols.map(k=>q(k==="tags"?r.tags.join("; "):r[k])).join(","))].join("\r\n");
}
