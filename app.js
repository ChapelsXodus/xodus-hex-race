import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js';
import { doc, getFirestore, onSnapshot, serverTimestamp, setDoc } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';

const firebaseApp=initializeApp({
 apiKey:'AIzaSyBPF1Mn6QLvIkz76FfkxovChjUiG_WaA9U',
 authDomain:'xodus-hex-race.firebaseapp.com',
 projectId:'xodus-hex-race',
 storageBucket:'xodus-hex-race.firebasestorage.app',
 messagingSenderId:'867509300673',
 appId:'1:867509300673:web:f1abe5aee9f91ad0dad340'
});
const auth=getAuth(firebaseApp),db=getFirestore(firebaseApp),eventRef=doc(db,'events','main');
const SVG_NS='http://www.w3.org/2000/svg';
const colors=['#df4d4d','#4287e7','#46a66b','#b06ce3','#ee903d','#31b7bf'];
const teamNames=['Crimson','Azure','Verdant','Violet','Ember','Cyan'];
const outer=[
 ['Scurrius','Bone weapon spine',1],['Barrows','Any Ahrim piece',5],['Barrows','Any Dharok piece',5],['Barrows','Any Guthan piece',5],['Barrows','Any Karil piece',5],['Barrows','Any Torag piece',5],['Barrows','Any Verac piece',5],
 ['Perilous Moons','Any Blood Moon piece',4],['Perilous Moons','Any Blue Moon piece',4],['Perilous Moons','Any Eclipse Moon piece',4],['Dagannoth Kings','Berserker ring',3],['Dagannoth Kings','Archers ring',3],['Dagannoth Kings','Seers ring',3],['Dagannoth Kings','Warrior ring',3],
 ['Royal Titans','Any Twinflame staff piece',4],['Amoxliatl','Pendant of Ates',1],['Amoxliatl','Glacial temotli',3],['Hueycoatl','Hueycoatl hide',1],['Phantom Muspah','Venator shard',5],['Sarachnis','Sarachnis cudgel',5],['Zulrah','Any standard unique',4],
 ['K’ril Tsutsaroth','Any boss-specific unique',2],['General Graardor','Any boss-specific unique',2],['Commander Zilyana','Any boss-specific unique',2],['Kree’arra','Any boss-specific unique',2],['God Wars Dungeon','Any Godsword shard',3]
];
const middle=[
 ['K’ril Tsutsaroth','Zamorakian spear',1],['K’ril Tsutsaroth','Staff of the dead',1],['K’ril Tsutsaroth','Zamorak hilt',3],['General Graardor','Bandos chestplate',3],['General Graardor','Bandos tassets',3],['General Graardor','Bandos hilt',4],
 ['Commander Zilyana','Armadyl crossbow',4],['Commander Zilyana','Saradomin hilt',4],['Kree’arra','Armadyl chestplate',4],['Kree’arra','Armadyl chainskirt',4],['Kree’arra','Armadyl hilt',5],['Callisto','Voidwaker hilt',2],['Callisto','Tyrannical ring',2],
 ['Venenatis','Voidwaker gem',3],['Venenatis','Treasonous ring',3],['Vet’ion','Voidwaker blade',3],['Vet’ion','Ring of the gods',3],['Hueycoatl','Dragon hunter wand',2],['Hueycoatl','Tome of earth',1],['Corrupted Gauntlet','Armour seed',3],
 ['Zulrah','Tanzanite fang',5],['Zulrah','Magic fang',5],['Zulrah','Serpentine visage',5],['Yama','Soulflame horn or any Oathplate piece',3]
];
const ring2=[['Chambers of Xeric','Any purple'],['Tombs of Amascut','Any purple'],['Theatre of Blood','Any purple'],['Nex','Any unique']];
const ring1=[['Corporeal Beast','Any sigil'],['The Nightmare','Any unique']];
const vault=['The Vault','Twisted bow, Tumeken’s shadow, or Scythe of vitur'];
let teamCount=Number(localStorage.getItem('xodus-team-count')||4),viewTeam=Number(localStorage.getItem('xodus-view-team')||0),organizer=false,selected=null;
let claims=JSON.parse(localStorage.getItem('xodus-claims')||'{}');
let actionStack=JSON.parse(localStorage.getItem('xodus-actions')||'[]'),eventLog=JSON.parse(localStorage.getItem('xodus-event-log')||'[]'),setupLocked=localStorage.getItem('xodus-setup-locked')==='true';
let view={x:0,y:0,scale:1},drag=null;
const $=id=>document.getElementById(id), board=$('board'), viewport=$('viewport');

function axialDistance(q,r){return Math.max(Math.abs(q),Math.abs(r),Math.abs(-q-r));}
function angleOf(q,r){return Math.atan2(Math.sqrt(3)*(r+q/2),1.5*q)}
function coordKey(q,r){return `${q},${r}`}
function angleDistance(a,b){let d=Math.abs(a-b)%(Math.PI*2);return Math.min(d,Math.PI*2-d)}
function directness(cell){const baseAngles=teamBases().map(b=>angleOf(b.q,b.r));const nearest=Math.min(...baseAngles.map(a=>angleDistance(cell.angle,a)));const halfGap=Math.PI/teamCount;return 1-Math.min(1,nearest/halfGap)}
function zone(d){return d===0?'vault':d<=2?'inner':d<=4?'middle':'outer';}
function shortBoss(name){return name.replace('General ','G. ').replace('Commander ','C. ').replace('Corporeal Beast','Corp').replace('Dagannoth Kings','DKs').replace('God Wars Dungeon','GWD').replace('Tombs of Amascut','ToA').replace('Theatre of Blood','ToB').replace('Chambers of Xeric','CoX').replace('Perilous Moons','Moons').slice(0,15)}
function teamBases(){const perimeter=[];for(let q=-7;q<=7;q++)for(let r=-7;r<=7;r++)if(axialDistance(q,r)===7)perimeter.push({q,r});perimeter.sort((a,b)=>Math.atan2(Math.sqrt(3)*(a.r+a.q/2),1.5*a.q)-Math.atan2(Math.sqrt(3)*(b.r+b.q/2),1.5*b.q));return Array.from({length:teamCount},(_,i)=>perimeter[Math.floor(i*perimeter.length/teamCount)]);}
function buildTiles(){
 const coords=[];for(let q=-7;q<=7;q++)for(let r=-7;r<=7;r++){const d=axialDistance(q,r);if(d<=7)coords.push({q,r,d,angle:angleOf(q,r)})}
 coords.sort((a,b)=>a.d-b.d||a.angle-b.angle);
 const placed=new Map();
 const pools={outer,middle};
 function expandedPool(pool,count){const bag=[];for(let i=0;i<count;i++)bag.push(pool[i%pool.length]);return bag}
 function placeDifficultyTiers(){
  const tierCells={middle:coords.filter(c=>c.d>=3&&c.d<=4),outer:coords.filter(c=>c.d>=5)};
  const groups=new Map();
  for(const tier of ['middle','outer'])for(const challenge of expandedPool(pools[tier],tierCells[tier].length)){if(!groups.has(challenge[0]))groups.set(challenge[0],{boss:challenge[0],middle:[],outer:[]});groups.get(challenge[0])[tier].push(challenge)}
  const list=[...groups.values()].sort((a,b)=>(b.middle.length+b.outer.length)-(a.middle.length+a.outer.length));
  const capacities=[0,1,2].map(color=>({middle:tierCells.middle.filter(c=>(c.q-c.r+30)%3===color).length,outer:tierCells.outer.filter(c=>(c.q-c.r+30)%3===color).length}));
  const remaining=capacities.map(x=>({...x})),assignment=new Map();
  function partition(i){if(i===list.length)return true;const g=list[i];for(let color=0;color<3;color++){if(remaining[color].middle<g.middle.length||remaining[color].outer<g.outer.length)continue;remaining[color].middle-=g.middle.length;remaining[color].outer-=g.outer.length;assignment.set(g.boss,color);if(partition(i+1))return true;remaining[color].middle+=g.middle.length;remaining[color].outer+=g.outer.length;assignment.delete(g.boss)}return false}
  if(!partition(0))throw new Error('Unable to balance challenge colors');
  for(const tier of ['middle','outer'])for(let color=0;color<3;color++){
   const cells=tierCells[tier].filter(c=>(c.q-c.r+30)%3===color).sort((a,b)=>directness(b)-directness(a)||a.angle-b.angle);
   const challenges=list.filter(g=>assignment.get(g.boss)===color).flatMap(g=>g[tier]).sort((a,b)=>b[2]-a[2]||a[0].localeCompare(b[0]));
   cells.forEach((cell,i)=>cell.challenge=challenges[i]);
  }
 }
 const byRing={1:coords.filter(c=>c.d===1),2:coords.filter(c=>c.d===2)};
 byRing[1].forEach((cell,i)=>cell.challenge=ring1[i%2]);
 byRing[2].forEach((cell,i)=>cell.challenge=ring2[i%4]);
 placeDifficultyTiers();
 coords.forEach(cell=>{
  let challenge=cell.challenge;
  if(cell.d===0)challenge=vault;
  const tile={id:`H${String(placed.size+1).padStart(3,'0')}`,q:cell.q,r:cell.r,d:cell.d,tier:zone(cell.d),boss:challenge[0],drop:challenge[1],difficulty:challenge[2]||5,directness:cell.d?directness(cell):1};
  placed.set(coordKey(cell.q,cell.r),tile);
 });
 return [...placed.values()];
}
let tiles=buildTiles();
function ownerFor(tile){const owner=claims[tile.id]?.team;return Number.isInteger(owner)&&owner<teamCount?owner:null;}
function neighbors(t){return [[1,0],[-1,0],[0,1],[0,-1],[1,-1],[-1,1]].map(([dq,dr])=>tiles.find(x=>x.q===t.q+dq&&x.r===t.r+dr)).filter(Boolean)}
function activeSet(team){const base=teamBases()[team];if(!base)return new Set();const start=tiles.find(t=>t.q===base.q&&t.r===base.r);const seen=new Set([start.id]),queue=[start];while(queue.length){const t=queue.shift();for(const n of neighbors(t))if(!seen.has(n.id)&&ownerFor(n)===team){seen.add(n.id);queue.push(n)}}return seen}
function isBase(tile){return teamBases().some(b=>b.q===tile.q&&b.r===tile.r)}
function isEligible(tile,team){if(!tile||team<0||team>=teamCount||isBase(tile)||ownerFor(tile)===team)return false;const active=activeSet(team);return neighbors(tile).some(n=>active.has(n.id))}
function eligibleSet(team){return new Set(tiles.filter(t=>isEligible(t,team)).map(t=>t.id))}
function polygon(cx,cy,s){return Array.from({length:6},(_,i)=>{const a=Math.PI/180*(60*i);return `${cx+s*Math.cos(a)},${cy+s*Math.sin(a)}`}).join(' ')}
function render(){board.innerHTML='';const s=28,bases=teamBases(),active=Array.from({length:teamCount},(_,i)=>activeSet(i)),eligible=eligibleSet(viewTeam);const g=document.createElementNS(SVG_NS,'g');g.setAttribute('transform',`translate(${view.x} ${view.y}) scale(${view.scale})`);g.id='mapGroup';
 tiles.forEach(t=>{const cx=1.5*s*t.q,cy=Math.sqrt(3)*s*(t.r+t.q/2),owner=ownerFor(t),baseTeam=bases.findIndex(b=>b.q===t.q&&b.r===t.r);const poly=document.createElementNS(SVG_NS,'polygon');poly.setAttribute('points',polygon(cx,cy,s-1.2));poly.setAttribute('class',`hex ${t.tier}${selected?.id===t.id?' selected':''}${eligible.has(t.id)?' eligible':''}${owner!==null&&!active[owner].has(t.id)?' inactive':''}`);poly.dataset.id=t.id;if(owner!==null)poly.style.fill=colors[owner];if(eligible.has(t.id))poly.style.stroke=colors[viewTeam];g.append(poly);
  const label=document.createElementNS(SVG_NS,'text');label.setAttribute('x',cx);label.setAttribute('y',cy+1);label.setAttribute('class','hex-label');label.textContent=baseTeam>=0?'':t.d===0?'VAULT':shortBoss(t.boss);g.append(label);
  if(t.d!==0&&baseTeam<0){const sub=document.createElementNS(SVG_NS,'text');sub.setAttribute('x',cx);sub.setAttribute('y',cy+10);sub.setAttribute('class','hex-tier');sub.textContent=t.id;g.append(sub)}
  if(baseTeam>=0){poly.style.fill=`color-mix(in srgb, ${colors[baseTeam]} 34%, #181b20)`;const circle=document.createElementNS(SVG_NS,'circle');circle.setAttribute('cx',cx);circle.setAttribute('cy',cy);circle.setAttribute('r',s-4);circle.setAttribute('class','base-ring');circle.style.stroke=colors[baseTeam];g.append(circle);const bt=document.createElementNS(SVG_NS,'text');bt.setAttribute('x',cx);bt.setAttribute('y',cy+3);bt.setAttribute('class','base-label');bt.textContent=`BASE ${baseTeam+1}`;g.append(bt)}
 });board.append(g);renderLegend();}
function fit(){const rect=viewport.getBoundingClientRect();view.scale=Math.min(rect.width/720,rect.height/720);view.x=rect.width/2;view.y=rect.height/2;render()}
function selectTile(t){selected=t;$('emptyState').hidden=true;$('tileDetails').hidden=false;$('panel').classList.add('open');const baseTeam=teamBases().findIndex(b=>b.q===t.q&&b.r===t.r),base=baseTeam>=0,claim=claims[t.id];if(claim){$('claimTeam').value=claim.team;$('claimPlayer').value=claim.player||'';$('claimProof').value=claim.proof||''}else{$('claimTeam').value=viewTeam;$('claimPlayer').value='';$('claimProof').value=''}$('tileId').textContent=base?`Protected starting tile`:`${t.id} · ${t.tier} tier`;$('bossName').textContent=base?`Team ${teamNames[baseTeam]} Base`:t.boss;$('dropName').textContent=base?'No PvM challenge is assigned to this tile.':t.drop;$('tierName').textContent=base?'Base':t.tier[0].toUpperCase()+t.tier.slice(1);$('distance').textContent=base?'Perimeter':t.d===0?'Center':`${t.d} ring${t.d===1?'':'s'}`;$('difficulty').textContent=base?'—':t.d<=2?'Final barrier':['','Low','Moderate','Challenging','Hard','Severe'][t.difficulty];$('routeType').textContent=base?'Starting point':t.d<=2?'Required':t.directness>.66?'Direct shortcut':t.directness<.34?'Wide detour':'Side route';const owner=ownerFor(t),claimingTeam=Number($('claimTeam').value||viewTeam),eligible=isEligible(t,claimingTeam);$('tileOwner').textContent=base?`Team ${teamNames[baseTeam]}`:owner===null?'Unclaimed':`Team ${teamNames[owner]}`;$('tileStatus').textContent=base?'Protected':owner===null?'Available':activeSet(owner).has(t.id)?'Active':'Inactive';$('eligibility').textContent=base?'Cannot be captured':eligible?`Open to ${teamNames[claimingTeam]}`:`Blocked for ${teamNames[claimingTeam]}`;$('claimType').textContent=base?'None':owner===null?'New capture':owner===claimingTeam?'Already owned':'Steal';$('claimButton').textContent=base?'Protected base':owner===null?'Capture tile':'Steal tile';$('claimButton').disabled=!eligible;$('correctButton').disabled=!claim;$('removeButton').disabled=!claim;render()}
function renderLegend(){const counts=Array.from({length:teamCount},(_,i)=>tiles.filter(t=>ownerFor(t)===i).length),options=Array.from({length:teamCount},(_,i)=>`<option value="${i}">Team ${teamNames[i]}</option>`).join(''),currentClaim=Number($('claimTeam').value);$('teamLegend').innerHTML=Array.from({length:teamCount},(_,i)=>`<div class="legend-row"><span><i class="team-swatch" style="background:${colors[i]}"></i>Team ${teamNames[i]}</span><b>${counts[i]} tiles · ${eligibleSet(i).size} targets</b></div>`).join('');$('claimTeam').innerHTML=options;$('viewTeam').innerHTML=options;$('viewTeam').value=viewTeam;$('claimTeam').value=currentClaim<teamCount?currentClaim:viewTeam}
function syncStatus(text,state=''){$('syncStatus').textContent=text;$('syncStatus').className=`sync-status ${state}`}
async function saveEventState(){
 localStorage.setItem('xodus-claims',JSON.stringify(claims));localStorage.setItem('xodus-actions',JSON.stringify(actionStack));localStorage.setItem('xodus-event-log',JSON.stringify(eventLog));localStorage.setItem('xodus-team-count',teamCount);localStorage.setItem('xodus-setup-locked',setupLocked);
 if(!auth.currentUser)return;
 syncStatus('Saving…');
 try{await setDoc(eventRef,{teamCount,claims,actionStack,eventLog,setupLocked,updatedAt:serverTimestamp()},{merge:true});syncStatus('Live · saved','online')}
 catch(error){console.error(error);syncStatus('Save failed','error');toast('Could not save to the live board')}
}
function recordChange(tileId,before,after,type,label){actionStack.push({tileId,before,after});eventLog.push({type,label,time:new Date().toISOString()});saveEventState();renderHistory()}
function renderHistory(){const items=eventLog.slice(-10).reverse();$('eventHistory').innerHTML=items.length?items.map(x=>`<div class="history-item"><b>${x.type}</b> · ${x.label}</div>`).join(''):'<div class="history-item">No event actions yet.</div>';$('undoButton').disabled=!actionStack.length;$('lockButton').textContent=setupLocked?'Unlock setup':'Lock setup';$('teamCount').disabled=!organizer||setupLocked}
function toast(msg){const el=$('toast');el.textContent=msg;el.classList.add('show');clearTimeout(el.timer);el.timer=setTimeout(()=>el.classList.remove('show'),2200)}
$('teamCount').value=teamCount;$('teamCount').disabled=true;$('teamCount').onchange=e=>{if(!organizer)return;teamCount=Number(e.target.value);viewTeam=Math.min(viewTeam,teamCount-1);claims=Object.fromEntries(Object.entries(claims).filter(([,c])=>c.team<teamCount));tiles=buildTiles();selected=null;$('emptyState').hidden=false;$('tileDetails').hidden=true;saveEventState();render()};
$('viewTeam').onchange=e=>{viewTeam=Number(e.target.value);$('claimTeam').value=viewTeam;localStorage.setItem('xodus-view-team',viewTeam);if(selected)selectTile(selected);else render()};
$('claimTeam').onchange=()=>{};
function setOrganizerMode(enabled){organizer=enabled&&!!auth.currentUser;$('organizerTools').hidden=!organizer;$('adminPanel').hidden=!organizer;$('modeButton').classList.toggle('active',organizer);$('modeButton').textContent=organizer?'Organizer mode: On':auth.currentUser?'Organizer mode':'Organizer sign in';renderHistory()}
$('modeButton').onclick=()=>{if(!auth.currentUser){$('loginError').textContent='';$('loginDialog').showModal();$('loginEmail').focus();return}setOrganizerMode(!organizer);toast(organizer?'Organizer controls unlocked':'Clan view restored')};
$('loginForm').onsubmit=async e=>{e.preventDefault();$('loginError').textContent='';const submit=e.submitter;submit.disabled=true;try{await signInWithEmailAndPassword(auth,$('loginEmail').value.trim(),$('loginPassword').value);$('loginDialog').close();$('loginPassword').value='';setOrganizerMode(true);toast('Organizer controls unlocked')}catch(error){console.error(error);$('loginError').textContent='Email or password was not accepted.'}finally{submit.disabled=false}};
$('cancelLogin').onclick=()=>$('loginDialog').close();
$('signOutButton').onclick=async()=>{await signOut(auth);setOrganizerMode(false);toast('Signed out')};
$('claimButton').onclick=()=>{if(!selected)return;const team=Number($('claimTeam').value);if(!isEligible(selected,team)){toast('That tile is not connected to active territory');return}const previous=claims[selected.id]?structuredClone(claims[selected.id]):null,event={team,player:$('claimPlayer').value.trim()||'Unrecorded',proof:$('claimProof').value.trim(),time:new Date().toISOString(),type:previous?'steal':'capture'},history=previous?.history?[...previous.history]:previous?[{team:previous.team,player:previous.player,proof:previous.proof,time:previous.time,type:previous.type||'capture'}]:[];history.push(event);claims[selected.id]={...event,history};recordChange(selected.id,previous,structuredClone(claims[selected.id]),event.type,`${selected.id} · Team ${teamNames[team]}`);toast(`${selected.id} ${event.type==='steal'?'stolen':'captured'} by Team ${teamNames[team]}`);selectTile(selected)};
$('correctButton').onclick=()=>{if(!selected||!claims[selected.id]){toast('This tile has no claim to correct');return}const before=structuredClone(claims[selected.id]),team=Number($('claimTeam').value);claims[selected.id]={...claims[selected.id],team,player:$('claimPlayer').value.trim()||'Unrecorded',proof:$('claimProof').value.trim()};recordChange(selected.id,before,structuredClone(claims[selected.id]),'Correction',`${selected.id} · Team ${teamNames[team]}`);toast('Claim corrected');selectTile(selected)};
$('removeButton').onclick=()=>{if(!selected||!claims[selected.id]){toast('This tile has no claim to remove');return}const before=structuredClone(claims[selected.id]);delete claims[selected.id];recordChange(selected.id,before,null,'Removed',selected.id);toast('Claim removed');selectTile(selected)};
$('undoButton').onclick=()=>{const action=actionStack.pop();if(!action)return;if(action.before)claims[action.tileId]=action.before;else delete claims[action.tileId];eventLog.push({type:'Undo',label:action.tileId,time:new Date().toISOString()});saveEventState();renderHistory();if(selected)selectTile(selected);else render();toast('Last change undone')};
$('resetButton').onclick=()=>$('resetDialog').showModal();$('cancelReset').onclick=()=>$('resetDialog').close();
$('confirmReset').onclick=()=>{claims={};actionStack=[];eventLog=[];saveEventState();$('resetDialog').close();renderHistory();if(selected)selectTile(selected);else render();toast('Event reset')};
$('lockButton').onclick=()=>{setupLocked=!setupLocked;saveEventState();renderHistory();toast(setupLocked?'Team count and layout locked':'Setup unlocked')};
$('fitButton').onclick=fit;$('zoomIn').onclick=()=>{view.scale=Math.min(3,view.scale*1.18);render()};$('zoomOut').onclick=()=>{view.scale=Math.max(.35,view.scale/1.18);render()};
viewport.addEventListener('wheel',e=>{e.preventDefault();view.scale=Math.max(.35,Math.min(3,view.scale*(e.deltaY<0?1.1:.9)));render()},{passive:false});
viewport.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,vx:view.x,vy:view.y,moved:false,tileId:e.target.dataset.id||null,pointerId:e.pointerId}});
viewport.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(!drag.moved&&Math.hypot(dx,dy)<5)return;if(!drag.moved){drag.moved=true;viewport.setPointerCapture(e.pointerId);viewport.classList.add('dragging')}view.x=drag.vx+dx;view.y=drag.vy+dy;render()});
viewport.addEventListener('pointerup',e=>{if(!drag)return;const clickedId=!drag.moved?drag.tileId:null;if(drag.moved&&viewport.hasPointerCapture(e.pointerId))viewport.releasePointerCapture(e.pointerId);drag=null;viewport.classList.remove('dragging');if(clickedId){const tile=tiles.find(t=>t.id===clickedId);if(tile)selectTile(tile)}});
viewport.addEventListener('pointercancel',()=>{drag=null;viewport.classList.remove('dragging')});
onAuthStateChanged(auth,user=>{if(!user)setOrganizerMode(false);else{$('modeButton').textContent='Organizer mode';renderHistory()}});
onSnapshot(eventRef,snapshot=>{
 if(snapshot.exists()){
  const data=snapshot.data();teamCount=Number(data.teamCount||4);claims=data.claims||{};actionStack=data.actionStack||[];eventLog=data.eventLog||[];setupLocked=!!data.setupLocked;viewTeam=Math.min(viewTeam,teamCount-1);tiles=buildTiles();$('teamCount').value=teamCount;localStorage.setItem('xodus-team-count',teamCount);localStorage.setItem('xodus-claims',JSON.stringify(claims));localStorage.setItem('xodus-actions',JSON.stringify(actionStack));localStorage.setItem('xodus-event-log',JSON.stringify(eventLog));localStorage.setItem('xodus-setup-locked',setupLocked);if(selected)selected=tiles.find(t=>t.id===selected.id)||null;renderHistory();if(selected)selectTile(selected);else render();
 }else{
  teamCount=4;viewTeam=Math.min(viewTeam,3);claims={};actionStack=[];eventLog=[];setupLocked=false;tiles=buildTiles();$('teamCount').value=teamCount;localStorage.removeItem('xodus-claims');localStorage.removeItem('xodus-actions');localStorage.removeItem('xodus-event-log');localStorage.removeItem('xodus-setup-locked');renderHistory();render();
 }
 syncStatus('Live · connected','online');
},error=>{console.error(error);syncStatus('Offline · retrying','error')});
window.addEventListener('resize',fit);fit();
