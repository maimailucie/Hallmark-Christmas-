const API="https://api.themoviedb.org/3";
const IMG="https://image.tmdb.org/t/p/w500";
const CORS={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"GET, OPTIONS","Access-Control-Allow-Headers":"*","Content-Type":"application/json; charset=utf-8"};
const manifest={id:"community.hallmark.christmas.movies",version:"1.4.0",name:"Hallmark Christmas Movies",description:"Danh mục phim Giáng Sinh Hallmark; metadata từ TMDB.",resources:["catalog","meta"],types:["movie"],idPrefixes:["tt","tmdb:"],catalogs:[{type:"movie",id:"hallmark_christmas_latest",name:"🎄 Hallmark Christmas • Tất cả",extra:[{name:"skip","isRequired":false}]}]};
const json=(d,s=200,h={})=>new Response(JSON.stringify(d),{status:s,headers:{...CORS,...h}});
async function tmdb(path,key,params={}){const u=new URL(API+path);u.searchParams.set("api_key",key);u.searchParams.set("language","vi-VN");for(const [k,v] of Object.entries(params))u.searchParams.set(k,String(v));const r=await fetch(u);if(!r.ok)throw Error("TMDB HTTP "+r.status);return r.json();}
function toMeta(m,ids={}){return {id:ids.imdb_id||"tmdb:"+m.id,type:"movie",name:m.title||m.original_title,poster:m.poster_path?IMG+m.poster_path:undefined,background:m.backdrop_path?"https://image.tmdb.org/t/p/w1280"+m.backdrop_path:undefined,description:m.overview||"",releaseInfo:(m.release_date||"").slice(0,4),imdbRating:m.vote_average?m.vote_average.toFixed(1):undefined,genres:m.genres?.map(g=>g.name)};}
function clean(s){return s.replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/&amp;/g,"&").replace(/&#39;|&apos;/g,"'").replace(/&quot;/g,'"').replace(/&nbsp;/g," ").replace(/\s+/g," ").trim();}
function norm(s){return String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/&amp;/g,"&").replace(/[^a-z0-9]+/g," ").trim().replace(/\s+/g," ");}
function slugTitle(slug){return decodeURIComponent(slug||"").replace(/[-_]+/g," ").replace(/\b\w/g,c=>c.toUpperCase()).trim();}
function extractMovies(html){
  const found=new Map();
  // XmasDB detail links are stable movie records: /movie/<xmasdb-id>/<slug>/
  const re=/<a\b[^>]*href=["'](?:https?:\/\/www\.xmasdb\.com)?\/movie\/\d+\/([^"'/?#]+)\/?[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while((m=re.exec(html))!==null){
    const slug=m[1]; const inner=clean(m[2]);
    const title=inner.length>2&&inner.length<120?inner:slugTitle(slug);
    const around=html.slice(Math.max(0,m.index-1200),Math.min(html.length,re.lastIndex+1800));
    const yearMatch=around.match(/(?:Release Date|Christmas|\b)(19\d{2}|20\d{2})\b/i);
    if(!yearMatch)continue;
    const year=yearMatch[1];
    if(/^(hallmark|christmas movies|coming soon|xmasdb)$/i.test(title))continue;
    found.set(norm(title)+"|"+year,[title,year]);
  }
  // Fallback for cards where anchor text is empty but the slug and year are present.
  if(!found.size){
    const r=/<a\b[^>]*href=["'](?:https?:\/\/www\.xmasdb\.com)?\/movie\/\d+\/([^"'/?#]+)\/?[^>]*>/gi;
    while((m=r.exec(html))!==null){const around=html.slice(Math.max(0,m.index-900),Math.min(html.length,m.index+1600));const y=around.match(/\b(19\d{2}|20\d{2})\b/);if(y){const t=slugTitle(m[1]);found.set(norm(t)+"|"+y[1],[t,y[1]]);}}
  }
  return [...found.values()];
}
async function sourceTitles(){const all=new Map();const candidates=[n=>`https://www.xmasdb.com/hallmark/${n===1?"":"?page="+n}`,n=>`https://xmasdb.com/hallmark/${n===1?"":"?page="+n}`,n=>`https://www.xmasdb.com/hallmark/page/${n}/`];
 for(let page=1;page<=17;page++){let html="";for(const make of candidates){try{const r=await fetch(make(page),{headers:{"User-Agent":"Mozilla/5.0 (compatible; HallmarkCatalog/1.0)",Accept:"text/html"}});if(r.ok){const x=await r.text();if(x.includes("Hallmark")&&x.length>1000){html=x;break;}}}catch{}}
  if(!html)continue;for(const item of extractMovies(html))all.set(item[0].toLowerCase()+"|"+item[1],item);
 }
 return [...all.values()];}
function similarity(a,b){
 const A=norm(a),B=norm(b); if(!A||!B)return 0; if(A===B)return 1;
 const ta=new Set(A.split(" ")),tb=new Set(B.split(" ")); const inter=[...ta].filter(x=>tb.has(x)).length;
 const dice=2*inter/(ta.size+tb.size); const contain=A.includes(B)||B.includes(A)?0.92:0;
 return Math.max(dice,contain);
}
async function lookup(title,year,key){
 const queries=[title, title.replace(/[:'’!?-]/g," ").replace(/\s+/g," ").trim()];
 let candidates=[];
 for(const q of [...new Set(queries)]){
   const r=await tmdb("/search/movie",key,{query:q,include_adult:false});
   candidates.push(...(r.results||[]));
   if(candidates.some(x=>similarity(title,x.title||x.original_title)>=0.98))break;
 }
 const uniq=[...new Map(candidates.map(x=>[x.id,x])).values()];
 const ranked=uniq.map(x=>({x,sim:Math.max(similarity(title,x.title),similarity(title,x.original_title)),yearDiff:Math.abs(Number((x.release_date||"0000").slice(0,4))-Number(year))}));
 ranked.sort((a,b)=>(b.sim-a.sim)||(a.yearDiff-b.yearDiff)||((b.x.vote_count||0)-(a.x.vote_count||0)));
 const best=ranked[0];
 // Avoid false positives: accept exact/near-exact title only; prefer matching year but allow one-year metadata drift.
 if(!best||best.sim<0.86||best.yearDiff>1)return null;
 const d=await tmdb("/movie/"+best.x.id,key,{append_to_response:"external_ids"});
 return toMeta(d,d.external_ids||{});
}
async function catalog(key,skip){const titles=await sourceTitles();const out=[];for(let i=0;i<titles.length;i+=8){const batch=await Promise.all(titles.slice(i,i+8).map(([t,y])=>lookup(t,y,key).catch(()=>null)));out.push(...batch.filter(Boolean));}
 out.sort((a,b)=>(b.releaseInfo||"").localeCompare(a.releaseInfo||"")||a.name.localeCompare(b.name));return {metas:out.slice(skip,skip+100),sourceCount:titles.length,matchedCount:out.length,unmatchedCount:Math.max(0,titles.length-out.length)};}
async function getMeta(id,key){if(id.startsWith("tmdb:")){const d=await tmdb("/movie/"+id.slice(5),key,{append_to_response:"external_ids"});return toMeta(d,d.external_ids||{});}if(/^tt\d+$/.test(id)){const f=await tmdb("/find/"+id,key,{external_source:"imdb_id"});const m=f.movie_results?.[0];if(!m)return null;const d=await tmdb("/movie/"+m.id,key,{append_to_response:"external_ids"});return toMeta(d,d.external_ids||{imdb_id:id});}return null;}
export default {async fetch(req,env){const u=new URL(req.url);if(req.method==="OPTIONS")return new Response(null,{status:204,headers:CORS});if(u.pathname==="/")return new Response("Hallmark Christmas addon v1.4.0 running",{headers:{...CORS,"Content-Type":"text/plain"}});if(u.pathname==="/manifest.json")return json(manifest);if(!env.TMDB_API_KEY)return json({error:"Thiếu Secret TMDB_API_KEY"},500);const c=u.pathname.match(/^\/catalog\/movie\/hallmark_christmas_latest(?:\/(.*))?\.json$/);if(c){try{const data=await catalog(env.TMDB_API_KEY,Number(u.searchParams.get("skip")||0));return json(data,200,{"Cache-Control":"public, max-age=1800"});}catch(e){return json({metas:[],error:String(e.message||e)},502);}}const m=u.pathname.match(/^\/meta\/movie\/([^/]+)\.json$/);if(m){try{const x=await getMeta(decodeURIComponent(m[1]),env.TMDB_API_KEY);return x?json({meta:x}):json({meta:null},404);}catch(e){return json({error:String(e.message||e)},502);}}return json({error:"Not found"},404);}};
