import { useState, useMemo } from "react";

const SUMMARY = {
  hsTotalCompanies:7001,hsActiveCompanies:2696,cbTotalCustomers:8534,cbActiveSubscriptions:2685,
  hsTotalMRR:938793,cbTotalMRR:941855,hsTotalARR:11265517,cbTotalARR:11302265,
  totalCredits:1887063,failedPayments:3300,
  renewalOutcomes:{Expansion:2028,Flat:1008,Churn:743,Downsell:145},
};

const CONTROLS=[
  {id:"c1",category:"Leakage",name:"Orphan Subscription",total:2685,failing:55,logic:"CB subscription exists but no HS company record"},
  {id:"c2",category:"Leakage",name:"Customer Without Subscription",total:2696,failing:125,logic:"HS Active customer but no CB active subscription"},
  {id:"c3",category:"Leakage",name:"Active Sub Without Invoice",total:2685,failing:14,logic:"Active subscription but no invoice generated"},
  {id:"c4",category:"Leakage",name:"Failed Payment Aging",total:12407,failing:3300,logic:"Failed payments unresolved beyond threshold"},
  {id:"c5",category:"Leakage",name:"Zero Value Subscription",total:2685,failing:46,logic:"Active subscription with $0 MRR"},
  {id:"c6",category:"Customer",name:"Active Customer Count Recon",total:2696,failing:11,logic:"HS Active: 2,696 vs CB Active: 2,685"},
  {id:"c7",category:"Customer",name:"Active Customer Record Match",total:2696,failing:125,logic:"HS companies not matched to CB customers"},
  {id:"c8",category:"Customer",name:"Invoice Without Payment Method",total:8534,failing:4488,logic:"CB customer missing card/payment method"},
  {id:"c9",category:"Lifecycle",name:"Status Mismatch",total:2696,failing:83,logic:"HS Active but CB subscription not active"},
  {id:"c10",category:"Lifecycle",name:"Churn Date Alignment",total:1141,failing:466,logic:"HS churn date vs CB cancelled date differ >7 days"},
  {id:"c11",category:"Lifecycle",name:"Closed-Won Deal Without Subscription",total:66,failing:0,logic:"HS deal closed but subscription missing in CB"},
  {id:"c12",category:"Revenue",name:"MRR Reconciliation",total:1,failing:1,logic:"HS MRR $938,793 vs CB MRR $941,855 — Delta $3,062",isSummary:true,hsMRR:938793,cbMRR:941855},
  {id:"c13",category:"Revenue",name:"ARR Reconciliation",total:1,failing:1,logic:"HS ARR $11,265,517 vs CB ARR $11,302,265 — Delta $36,748",isSummary:true,hsARR:11265517,cbARR:11302265},
  {id:"c14",category:"Revenue",name:"Invoice Amount Validation",total:21485,failing:424,logic:"Invoices with Payment Due or Not Paid status"},
  {id:"c15",category:"Renewal Integrity",name:"Renewal Closed but Sub Cancelled",total:3061,failing:183,logic:"HS Renewal Closed Won but CB subscription Cancelled"},
  {id:"c16",category:"Renewal Integrity",name:"Renewal Closed but Sub Missing",total:4171,failing:238,logic:"Renewal deal exists but no CB subscription linked"},
  {id:"c17",category:"Renewal Integrity",name:"Renewal MRR vs Billing MRR",total:3101,failing:1192,logic:"HS Renewal ARR/12 ≠ CB subscription MRR by >$5"},
];

const RECORDS=[
  {id:"51768409191",company:"Precision Neurology",customerId:"HS51768409191",hsMRR:359,hsARR:4308,cbStatus:"Active",cbMRR:359,cbPlan:"Growth-USD-Yearly",issues:[]},
  {id:"52624224666",company:"Winterholler Dental",customerId:"HS51726682156",hsMRR:219,hsARR:2628,cbStatus:"Active",cbMRR:219,cbPlan:"Foundation-USD-Every-6-months",issues:[]},
  {id:"51524632707",company:"Jordan Lieberman DDS LLC",customerId:"HS51524632707",hsMRR:305.15,hsARR:3661.8,cbStatus:"Active",cbMRR:305.15,cbPlan:"Growth-USD-Yearly",issues:[]},
  {id:"50775531437",company:"Michael R. Schwartz MD",customerId:"Azym3uVAU9rnF5Uhw",hsMRR:409,hsARR:4908,cbStatus:"Active",cbMRR:409,cbPlan:"Growth-USD-Yearly",issues:[]},
  {id:"50593353094",company:"Daniel O'Brien DMD LLC",customerId:"HS50593353094",hsMRR:254.15,hsARR:3049.8,cbStatus:"Active",cbMRR:254.15,cbPlan:"Growth-USD-Every-6-months",issues:[]},
  {id:"50617806732",company:"Midwest Compounders",customerId:"HS50617806732",hsMRR:1148,hsARR:13776,cbStatus:"Active",cbMRR:1148,cbPlan:"Advanced-USD-Every-3-months",issues:[]},
  {id:"50577440322",company:"On Klinic",customerId:"HS50577440322",hsMRR:107,hsARR:1284,cbStatus:"Active",cbMRR:107,cbPlan:"Foundation-USD-Yearly",issues:[]},
  {id:"50776037297",company:"Suffolk Spine & Joint Medical",customerId:"HS50428175000",hsMRR:299,hsARR:3588,cbStatus:"Active",cbMRR:299,cbPlan:"Growth-USD-Yearly",issues:[]},
  {id:"51219861343",company:"Circle Care Center",customerId:"HS51219861343",hsMRR:737.95,hsARR:8855.44,cbStatus:"Active",cbMRR:737.95,cbPlan:"Growth-USD-Yearly",issues:[]},
  {id:"49508589719",company:"VIBRANCE MEDICAL SPA",customerId:"AzZKxMVBWaOV85uUa",hsMRR:379,hsARR:4548,cbStatus:"Active",cbMRR:379,cbPlan:"Foundation-USD-Yearly",issues:[]},
  {id:"49184022691",company:"28 North Consulting",customerId:"HS49184022691",hsMRR:458.33,hsARR:5500,cbStatus:"Active",cbMRR:458.33,cbPlan:"Growth-USD-Yearly",issues:[]},
  {id:"52448554105",company:"High Point Dental",customerId:"HS51874584432",hsMRR:271.15,hsARR:3253.8,cbStatus:null,cbMRR:null,cbPlan:null,issues:["No CB Subscription"]},
  {id:"51548179492",company:"Better Days Therapies",customerId:"HS51548179492",hsMRR:339,hsARR:4068,cbStatus:"Active",cbMRR:349,cbPlan:"Growth-USD-Every-6-months",issues:["MRR Mismatch"]},
  {id:"49617835410",company:"Clear Min Health",customerId:"AzqKtKV9d2BUX349l",hsMRR:146.7,hsARR:1760.4,cbStatus:"Active",cbMRR:162.7,cbPlan:"Foundation-USD-Yearly",issues:["MRR Mismatch"]},
  {id:"48757074004",company:"Ivy Pediatrics",customerId:"HS48757074004",hsMRR:1202.04,hsARR:14424.5,cbStatus:"Active",cbMRR:1285.38,cbPlan:"Growth-USD-Yearly",issues:["MRR Mismatch"]},
  {id:"47831219858",company:"Southwestern Dermatology",customerId:"HS47831219858",hsMRR:280,hsARR:3360,cbStatus:"Active",cbMRR:690,cbPlan:"Growth-USD-Yearly",issues:["MRR Mismatch"]},
  {id:"47442124213",company:"MSO CHP ENT, LLC",customerId:"HS47442124213",hsMRR:505.08,hsARR:6060.96,cbStatus:"Active",cbMRR:605.08,cbPlan:"Growth-USD-Yearly",issues:["MRR Mismatch"]},
  {id:"47403825981",company:"Ruby Health",customerId:"HS47403825981",hsMRR:331.55,hsARR:3978.6,cbStatus:"Active",cbMRR:381.55,cbPlan:"Growth-USD-Yearly",issues:["MRR Mismatch"]},
  {id:"46906892098",company:"NovaDev LLC",customerId:"HS46906892098",hsMRR:139,hsARR:1668,cbStatus:null,cbMRR:null,cbPlan:null,issues:["No CB Subscription"]},
  {id:"45179307280",company:"Antoine Periodontics PC",customerId:"HS45179307280",hsMRR:124.95,hsARR:1499.4,cbStatus:"Active",cbMRR:132.95,cbPlan:"Foundation-USD-Yearly",issues:["MRR Mismatch"]},
  {id:"50094601912",company:"Boise River Dental",customerId:"16CMKsV4GfVdz4fka",hsMRR:145.35,hsARR:1744.2,cbStatus:"Active",cbMRR:171,cbPlan:"Foundation-USD-Yearly",issues:["MRR Mismatch"]},
  {id:"43388919594",company:"Toms River Addiction Medicine",customerId:"HS43388919594",hsMRR:123,hsARR:1476,cbStatus:"Active",cbMRR:131,cbPlan:"Foundation-USD-Yearly",issues:["MRR Mismatch"]},
  {id:"42719256165",company:"On-Time IT Solutions",customerId:"HS42719256165",hsMRR:null,hsARR:null,cbStatus:null,cbMRR:null,cbPlan:null,issues:["No CB Subscription"]},
  {id:"42275122805",company:"AGS Continuum",customerId:"16BT8AV2GJrge2Xub",hsMRR:99,hsARR:1188,cbStatus:"Active",cbMRR:115,cbPlan:"Foundation-USD-Yearly",issues:["MRR Mismatch"]},
  {id:"41520596255",company:"Dental Solutions of Binghamton",customerId:"HS41520596255",hsMRR:449,hsARR:5388,cbStatus:"Active",cbMRR:407.15,cbPlan:"Growth-USD-Yearly",issues:["MRR Mismatch"]},
  {id:"40958644854",company:"Tri Cities Behavioral Therapy",customerId:"HS40958644854",hsMRR:288,hsARR:3456,cbStatus:"Active",cbMRR:230.4,cbPlan:"Growth-USD-Yearly",issues:["MRR Mismatch"]},
  {id:"39282591790",company:"Beshara Group",customerId:"HS39282591790",hsMRR:319.67,hsARR:3836,cbStatus:"Active",cbMRR:278,cbPlan:"Growth-USD-Every-6-months",issues:["MRR Mismatch"]},
  {id:"39267251866",company:"Maryland Integrative Medicine",customerId:"HS39267251866",hsMRR:196.2,hsARR:2354.4,cbStatus:"Active",cbMRR:210.6,cbPlan:"Foundation-USD-Every-6-months",issues:["MRR Mismatch"]},
  {id:"39097420606",company:"Leong Plastic Surgery",customerId:"HS39097420606",hsMRR:329.67,hsARR:3956,cbStatus:"Active",cbMRR:288,cbPlan:"Growth-USD-Yearly",issues:["MRR Mismatch"]},
  {id:"39429370881",company:"NeuroHavenTMS",customerId:"HS39429370881",hsMRR:274.55,hsARR:3294.6,cbStatus:null,cbMRR:null,cbPlan:null,issues:["No CB Subscription"]},
];

const CATEGORIES=["All","Leakage","Customer","Lifecycle","Revenue","Renewal Integrity"];
const RECORD_FILTERS=["All","Matched","MRR Mismatch","No CB Subscription"];
const CAT_COLORS={Leakage:"#f87171",Customer:"#60a5fa",Lifecycle:"#a78bfa",Revenue:"#34d399","Renewal Integrity":"#fb923c"};
const P="#22d3a0",F="#f87171",W="#fb923c";

const fmt$=(v)=>v==null?"—":`$${Number(v).toLocaleString("en-US",{minimumFractionDigits:0,maximumFractionDigits:2})}`;
const fmtK=(v)=>Math.abs(v)>=1e6?`$${(v/1e6).toFixed(2)}M`:`$${(v/1e3).toFixed(0)}K`;
const passRate=(failing,total)=>total===0?100:Math.round(((total-failing)/total)*100);
const statusOf=(rate)=>rate===100?"pass":rate>=80?"warn":"fail";

export default function App(){
  const [tab,setTab]=useState("controls");
  const [catF,setCatF]=useState("All");
  const [recF,setRecF]=useState("All");
  const [search,setSearch]=useState("");
  const [selRec,setSelRec]=useState(null);
  const [selCtrl,setSelCtrl]=useState(null);

  const fControls=useMemo(()=>CONTROLS.filter(c=>
    (catF==="All"||c.category===catF)&&
    (search===""||c.name.toLowerCase().includes(search.toLowerCase()))
  ),[catF,search]);

  const fRecords=useMemo(()=>RECORDS.filter(r=>{
    const ms=r.company.toLowerCase().includes(search.toLowerCase())||r.customerId.toLowerCase().includes(search.toLowerCase());
    if(!ms)return false;
    if(recF==="All")return true;
    if(recF==="Matched")return r.issues.length===0;
    return r.issues.includes(recF);
  }),[recF,search]);

  const totalPass=CONTROLS.filter(c=>c.failing===0).length;
  const critCount=CONTROLS.filter(c=>passRate(c.failing,c.total)<80).length;
  const rnTotal=Object.values(SUMMARY.renewalOutcomes).reduce((a,b)=>a+b,0);

  const openPanel=selRec||selCtrl;

  return(
    <div style={{minHeight:"100vh",background:"#080b10",color:"#dce4f0",fontFamily:"'IBM Plex Mono',monospace"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600&family=Syne:wght@700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-track{background:#0a0d14}::-webkit-scrollbar-thumb{background:#1a2235;border-radius:2px}
        .tab{background:none;border:none;color:#2d3d55;font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.07em;text-transform:uppercase;padding:10px 18px;cursor:pointer;border-bottom:2px solid transparent;transition:all .15s}
        .tab:hover{color:#6a8aaa}.tab.on{color:#dce8ff;border-bottom-color:#4f6ef7}
        .chip{background:none;border:1px solid #151e2e;color:#2d3d55;font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.06em;text-transform:uppercase;padding:4px 11px;cursor:pointer;border-radius:2px;transition:all .15s}
        .chip:hover{border-color:#253550;color:#6a8aaa}.chip.on{border-color:#4f6ef7;color:#818cf8;background:#0d1228}
        .crow{display:grid;grid-template-columns:160px 1fr 80px 110px 65px;align-items:center;padding:10px 20px;border-bottom:1px solid #0d1118;cursor:pointer;transition:background .1s;font-size:11px}
        .crow:hover{background:#0b0f18}.crow.sel{background:#0c1222}
        .rrow{display:grid;grid-template-columns:20px 1fr 130px 85px 85px 110px 85px;align-items:center;padding:10px 20px;border-bottom:1px solid #0d1118;cursor:pointer;transition:background .1s;font-size:11px}
        .rrow:hover{background:#0b0f18}.rrow.sel{background:#0c1222}
        .bdg{display:inline-block;padding:2px 7px;border-radius:1px;font-size:9px;font-weight:600;letter-spacing:.1em;text-transform:uppercase}
        .bdg-p{background:#091a12;color:#22d3a0;border:1px solid #122e1f}
        .bdg-f{background:#1a0808;color:#f87171;border:1px solid #321414}
        .bdg-w{background:#1a0f06;color:#fb923c;border:1px solid #32200c}
        .pbar{height:3px;background:#0f141c;border-radius:1px;overflow:hidden;margin-top:4px}
        .pfill{height:100%;border-radius:1px}
        .panel{background:#07090f;border-left:1px solid #111825;position:fixed;right:0;top:0;bottom:0;width:350px;overflow-y:auto;padding:24px 22px;transform:translateX(100%);transition:transform .22s cubic-bezier(.16,1,.3,1);z-index:20}
        .panel.on{transform:translateX(0)}
        .drow{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #0d1118;font-size:11px}
        .dl{color:#2d3d55}.dv{color:#b8cce0;text-align:right;max-width:55%;word-break:break-all}
        .sinp{background:#0c1018;border:1px solid #151e2e;color:#b8cce0;font-family:'IBM Plex Mono',monospace;font-size:11px;padding:6px 11px;outline:none;border-radius:2px;width:200px}
        .sinp:focus{border-color:#253550}.sinp::placeholder{color:#1a2535}
        .mcard{background:#0c1018;border:1px solid #111825;padding:14px 16px;border-radius:2px}
        @keyframes fi{from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:translateY(0)}}
        .fi{animation:fi .18s ease forwards}
      `}</style>

      {/* HEADER */}
      <div style={{borderBottom:"1px solid #111825",padding:"14px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",background:"#060810"}}>
        <div style={{display:"flex",alignItems:"center",gap:18}}>
          <div>
            <div style={{fontFamily:"'Syne',sans-serif",fontSize:16,fontWeight:800,color:"#e0ecff"}}>RECON<span style={{color:"#4f6ef7"}}>CTRL</span></div>
            <div style={{fontSize:9,color:"#1e2d45",letterSpacing:".12em",marginTop:1}}>HUBSPOT × CHARGEBEE · LIVE RECONCILIATION</div>
          </div>
          <div style={{width:1,height:26,background:"#111825"}}/>
          {[["HS MRR",fmtK(SUMMARY.hsTotalMRR),"#60a5fa"],["CB MRR",fmtK(SUMMARY.cbTotalMRR),"#818cf8"],["MRR Δ",fmtK(Math.abs(SUMMARY.hsTotalMRR-SUMMARY.cbTotalMRR)),W],["Credits",fmtK(SUMMARY.totalCredits),F]].map(([l,v,c])=>(
            <div key={l} style={{fontSize:10,color:"#2d3d55"}}>{l} <span style={{color:c,marginLeft:3,fontWeight:600}}>{v}</span></div>
          ))}
        </div>
        <div style={{display:"flex",gap:14,alignItems:"center"}}>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:9,color:"#1e2d45",letterSpacing:".1em"}}>CONTROLS PASSING</div>
            <div style={{fontFamily:"'Syne',sans-serif",fontSize:14,fontWeight:700,color:"#e0ecff"}}><span style={{color:P}}>{totalPass}</span><span style={{color:"#1e2d45"}}>/{CONTROLS.length}</span></div>
          </div>
          <div style={{width:1,height:26,background:"#111825"}}/>
          <div style={{fontSize:9,color:"#1e2d45"}}>SYNC · <span style={{color:"#2d3d55"}}>{new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</span></div>
        </div>
      </div>

      {/* STATS ROW */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:1,background:"#111825",borderBottom:"1px solid #111825"}}>
        {[
          ["HS Companies",SUMMARY.hsTotalCompanies.toLocaleString(),"total",null],
          ["HS Active",SUMMARY.hsActiveCompanies.toLocaleString(),"lifecycle = customer","#60a5fa"],
          ["CB Customers",SUMMARY.cbTotalCustomers.toLocaleString(),"total",null],
          ["CB Active Subs",SUMMARY.cbActiveSubscriptions.toLocaleString(),"status = active","#818cf8"],
          ["Failed Payments",SUMMARY.failedPayments.toLocaleString(),"unresolved",F],
          ["Critical Controls",critCount,"pass rate <80%",W],
        ].map(([l,v,s,c])=>(
          <div key={l} style={{background:"#080b10",padding:"12px 16px"}}>
            <div style={{fontSize:9,color:"#1e2d45",letterSpacing:".1em",textTransform:"uppercase",marginBottom:5}}>{l}</div>
            <div style={{fontFamily:"'Syne',sans-serif",fontSize:20,fontWeight:700,color:c||"#b8cce0",lineHeight:1}}>{v}</div>
            <div style={{fontSize:9,color:"#1e2d45",marginTop:3}}>{s}</div>
          </div>
        ))}
      </div>

      {/* TABS */}
      <div style={{borderBottom:"1px solid #111825",padding:"0 18px",display:"flex",alignItems:"center",background:"#060810"}}>
        {[["controls","Controls Framework"],["records","Record-Level Recon"],["renewal","Renewal Motion"],["revenue","Revenue Bridge"]].map(([id,lbl])=>(
          <button key={id} className={`tab${tab===id?" on":""}`} onClick={()=>{setTab(id);setSelRec(null);setSelCtrl(null);}}>{lbl}</button>
        ))}
        <div style={{flex:1}}/>
        <input className="sinp" placeholder="Search…" value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>

      {/* ── CONTROLS TAB ── */}
      {tab==="controls"&&(
        <div style={{display:"flex",height:"calc(100vh - 185px)"}}>
          <div style={{flex:1,overflowY:"auto",paddingRight:selCtrl?350:0,transition:"padding-right .22s cubic-bezier(.16,1,.3,1)"}}>
            <div style={{padding:"10px 20px",borderBottom:"1px solid #0d1118",display:"flex",gap:5,flexWrap:"wrap"}}>
              {CATEGORIES.map(c=><button key={c} className={`chip${catF===c?" on":""}`} onClick={()=>setCatF(c)}>{c}</button>)}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"160px 1fr 80px 110px 65px",padding:"7px 20px",fontSize:9,color:"#1e2d45",letterSpacing:".1em",textTransform:"uppercase",borderBottom:"1px solid #111825"}}>
              <div>Category</div><div>Control Name</div><div>Pass Rate</div><div>Failing/Total</div><div>Status</div>
            </div>
            {fControls.map(c=>{
              const pr=passRate(c.failing,c.total);
              const st=statusOf(pr);
              const bc=st==="pass"?P:st==="warn"?W:F;
              return(
                <div key={c.id} className={`crow${selCtrl?.id===c.id?" sel":""}`} onClick={()=>setSelCtrl(selCtrl?.id===c.id?null:c)}>
                  <div><span style={{display:"inline-block",width:6,height:6,borderRadius:"50%",background:CAT_COLORS[c.category],marginRight:6}}/><span style={{fontSize:10,color:CAT_COLORS[c.category]}}>{c.category}</span></div>
                  <div style={{color:"#8aa0bc",paddingRight:12}}>{c.name}</div>
                  <div><div style={{fontSize:12,fontWeight:600,color:bc}}>{pr}%</div><div className="pbar" style={{width:65}}><div className="pfill" style={{width:`${pr}%`,background:bc}}/></div></div>
                  <div style={{color:"#2d3d55"}}><span style={{color:c.failing>0?F:P}}>{c.failing.toLocaleString()}</span><span style={{color:"#1e2d45"}}> / {c.total.toLocaleString()}</span></div>
                  <div><span className={`bdg bdg-${st==="pass"?"p":st==="warn"?"w":"f"}`}>{st==="pass"?"PASS":st==="warn"?"WARN":"FAIL"}</span></div>
                </div>
              );
            })}
          </div>

          {/* Control panel */}
          <div className={`panel${selCtrl?" on":""}`}>
            {selCtrl&&(()=>{
              const pr=passRate(selCtrl.failing,selCtrl.total);
              const st=statusOf(pr);
              const bc=st==="pass"?P:st==="warn"?W:F;
              return(
                <div className="fi">
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:18}}>
                    <div><div style={{fontSize:9,color:CAT_COLORS[selCtrl.category],letterSpacing:".12em",textTransform:"uppercase",marginBottom:5}}>{selCtrl.category}</div>
                    <div style={{fontFamily:"'Syne',sans-serif",fontSize:14,fontWeight:700,color:"#d0e0f8",lineHeight:1.3}}>{selCtrl.name}</div></div>
                    <button onClick={()=>setSelCtrl(null)} style={{background:"none",border:"1px solid #111825",color:"#2d3d55",cursor:"pointer",padding:"3px 9px",fontFamily:"inherit",fontSize:11,borderRadius:1}}>✕</button>
                  </div>
                  <div style={{marginBottom:16}}><span className={`bdg bdg-${st==="pass"?"p":st==="warn"?"w":"f"}`}>{st.toUpperCase()}</span></div>
                  <div style={{background:"#0c1018",border:"1px solid #111825",borderRadius:2,padding:"16px",marginBottom:16}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                      <span style={{fontSize:9,color:"#2d3d55",letterSpacing:".1em"}}>PASS RATE</span>
                      <span style={{fontFamily:"'Syne',sans-serif",fontSize:20,fontWeight:700,color:bc}}>{pr}%</span>
                    </div>
                    <div style={{height:5,background:"#0d1118",borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:`${pr}%`,background:bc,borderRadius:2}}/></div>
                  </div>
                  {selCtrl.isSummary&&selCtrl.hsMRR&&(
                    <div style={{marginBottom:16}}>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                        {[["HubSpot",selCtrl.hsMRR,"#60a5fa"],["Chargebee",selCtrl.cbMRR,"#818cf8"]].map(([s,v,c])=>(
                          <div key={s} className="mcard"><div style={{fontSize:9,color:"#2d3d55",marginBottom:4}}>{s}</div><div style={{fontFamily:"'Syne',sans-serif",fontSize:15,fontWeight:700,color:c}}>{fmtK(v)}</div></div>
                        ))}
                      </div>
                      <div style={{fontSize:11,color:W,textAlign:"center"}}>Δ {fmtK(Math.abs(selCtrl.hsMRR-selCtrl.cbMRR))} delta</div>
                    </div>
                  )}
                  {selCtrl.isSummary&&selCtrl.hsARR&&(
                    <div style={{marginBottom:16}}>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                        {[["HubSpot",selCtrl.hsARR,"#60a5fa"],["Chargebee",selCtrl.cbARR,"#818cf8"]].map(([s,v,c])=>(
                          <div key={s} className="mcard"><div style={{fontSize:9,color:"#2d3d55",marginBottom:4}}>{s}</div><div style={{fontFamily:"'Syne',sans-serif",fontSize:15,fontWeight:700,color:c}}>{fmtK(v)}</div></div>
                        ))}
                      </div>
                      <div style={{fontSize:11,color:W,textAlign:"center"}}>Δ {fmtK(Math.abs(selCtrl.hsARR-selCtrl.cbARR))} delta</div>
                    </div>
                  )}
                  {[["Control ID",selCtrl.id.toUpperCase()],["Category",selCtrl.category],["Failing",selCtrl.failing.toLocaleString()],["Total",selCtrl.total.toLocaleString()],["Pass Rate",`${pr}%`]].map(([l,v])=>(
                    <div className="drow" key={l}><span className="dl">{l}</span><span className="dv">{v}</span></div>
                  ))}
                  <div style={{marginTop:14,background:"#09101a",border:"1px solid #111825",borderRadius:2,padding:12}}>
                    <div style={{fontSize:9,color:"#2d3d55",letterSpacing:".1em",marginBottom:6}}>LOGIC / VERIFICATION</div>
                    <div style={{fontSize:11,color:"#6a8aaa",lineHeight:1.6}}>{selCtrl.logic}</div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── RECORDS TAB ── */}
      {tab==="records"&&(
        <div style={{display:"flex",height:"calc(100vh - 185px)"}}>
          <div style={{flex:1,overflowY:"auto",paddingRight:selRec?350:0,transition:"padding-right .22s cubic-bezier(.16,1,.3,1)"}}>
            <div style={{padding:"10px 20px",borderBottom:"1px solid #0d1118",display:"flex",gap:5,alignItems:"center"}}>
              {RECORD_FILTERS.map(f=><button key={f} className={`chip${recF===f?" on":""}`} onClick={()=>setRecF(f)}>{f}</button>)}
              <div style={{marginLeft:"auto",fontSize:10,color:"#1e2d45"}}>{fRecords.length} records shown</div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"20px 1fr 130px 85px 85px 110px 85px",padding:"7px 20px",fontSize:9,color:"#1e2d45",letterSpacing:".1em",textTransform:"uppercase",borderBottom:"1px solid #111825"}}>
              <div/><div>Company</div><div>Customer ID</div><div>HS MRR</div><div>CB MRR</div><div>CB Plan</div><div>Status</div>
            </div>
            {fRecords.map(r=>{
              const st=r.issues.length===0?"matched":r.issues.includes("No CB Subscription")?"missing":"mismatch";
              const dc=st==="matched"?P:st==="missing"?F:W;
              return(
                <div key={r.id} className={`rrow${selRec?.id===r.id?" sel":""}`} onClick={()=>setSelRec(selRec?.id===r.id?null:r)}>
                  <div style={{width:7,height:7,borderRadius:"50%",background:dc,flexShrink:0}}/>
                  <div style={{color:"#8aa0bc",paddingRight:10,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.company}</div>
                  <div style={{color:"#2d3d55",fontSize:10}}>{r.customerId.length>15?r.customerId.slice(0,13)+"…":r.customerId}</div>
                  <div style={{color:"#6a8aaa"}}>{fmt$(r.hsMRR)}</div>
                  <div style={{color:r.cbMRR!==null&&r.hsMRR!==null&&Math.abs(r.hsMRR-r.cbMRR)>5?W:"#6a8aaa"}}>{fmt$(r.cbMRR)}</div>
                  <div style={{color:"#1e2d45",fontSize:10,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.cbPlan||"—"}</div>
                  <div><span className={`bdg bdg-${st==="matched"?"p":st==="missing"?"f":"w"}`}>{st==="matched"?"MATCH":st==="missing"?"MISSING":"MISMATCH"}</span></div>
                </div>
              );
            })}
          </div>

          {/* Record detail panel */}
          <div className={`panel${selRec?" on":""}`}>
            {selRec&&(()=>{
              const st=selRec.issues.length===0?"matched":selRec.issues.includes("No CB Subscription")?"missing":"mismatch";
              const delta=selRec.hsMRR!==null&&selRec.cbMRR!==null?Math.abs(selRec.hsMRR-selRec.cbMRR):null;
              return(
                <div className="fi">
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:18}}>
                    <div><div style={{fontFamily:"'Syne',sans-serif",fontSize:14,fontWeight:700,color:"#d0e0f8",marginBottom:4}}>{selRec.company}</div>
                    <div style={{fontSize:10,color:"#2d3d55"}}>{selRec.customerId}</div></div>
                    <button onClick={()=>setSelRec(null)} style={{background:"none",border:"1px solid #111825",color:"#2d3d55",cursor:"pointer",padding:"3px 9px",fontFamily:"inherit",fontSize:11,borderRadius:1}}>✕</button>
                  </div>
                  <div style={{marginBottom:14}}><span className={`bdg bdg-${st==="matched"?"p":st==="missing"?"f":"w"}`}>{st==="matched"?"MATCHED":st==="missing"?"MISSING IN CB":"MISMATCH"}</span></div>
                  {selRec.issues.length>0&&(
                    <div style={{background:"#120c04",border:"1px solid #281806",borderRadius:2,padding:12,marginBottom:14}}>
                      <div style={{fontSize:9,color:"#2d3d55",letterSpacing:".1em",marginBottom:6}}>ISSUES DETECTED</div>
                      {selRec.issues.map((iss,i)=><div key={i} style={{fontSize:11,color:W,display:"flex",gap:8}}><span>→</span>{iss}</div>)}
                    </div>
                  )}
                  {selRec.hsMRR!==null&&(
                    <div style={{marginBottom:14}}>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                        {[["HubSpot",selRec.hsMRR,"#60a5fa"],["Chargebee",selRec.cbMRR,"#818cf8"]].map(([l,v,c])=>(
                          <div key={l} className="mcard"><div style={{fontSize:9,color:"#2d3d55",marginBottom:3}}>{l}</div><div style={{fontFamily:"'Syne',sans-serif",fontSize:16,fontWeight:700,color:v===null?"#1e2d45":c}}>{fmt$(v)}</div></div>
                        ))}
                      </div>
                      {delta!==null&&<div style={{fontSize:11,textAlign:"center",color:delta>5?W:P}}>{delta>5?`Δ ${fmt$(delta)} MRR delta`:"✓ MRR in sync"}</div>}
                    </div>
                  )}
                  {[["Record ID",selRec.id],["Customer ID",selRec.customerId],["HS ARR",fmt$(selRec.hsARR)],["CB Plan",selRec.cbPlan||"—"],["CB Status",selRec.cbStatus||"—"]].map(([l,v])=>(
                    <div className="drow" key={l}><span className="dl">{l}</span><span className="dv">{v}</span></div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── RENEWAL MOTION TAB ── */}
      {tab==="renewal"&&(
        <div style={{padding:"24px 28px",overflowY:"auto",height:"calc(100vh - 185px)"}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:24}}>
            {[["Expansions",SUMMARY.renewalOutcomes.Expansion,"#22d3a0"],["Flat Renewals",SUMMARY.renewalOutcomes.Flat,"#60a5fa"],["Churns",SUMMARY.renewalOutcomes.Churn,F],["Downsells",SUMMARY.renewalOutcomes.Downsell,W]].map(([l,v,c])=>{
              const p=Math.round(v/rnTotal*100);
              return(
                <div key={l} style={{background:"#0c1018",border:"1px solid #111825",borderRadius:2,padding:"18px 20px"}}>
                  <div style={{fontSize:9,color:"#1e2d45",letterSpacing:".1em",textTransform:"uppercase",marginBottom:8}}>{l}</div>
                  <div style={{fontFamily:"'Syne',sans-serif",fontSize:30,fontWeight:700,color:c,lineHeight:1}}>{v.toLocaleString()}</div>
                  <div style={{fontSize:9,color:"#1e2d45",marginTop:5}}>{p}% of population</div>
                  <div style={{height:3,background:"#0d1118",borderRadius:1,marginTop:8}}><div style={{height:"100%",width:`${p}%`,background:c,borderRadius:1}}/></div>
                </div>
              );
            })}
          </div>
          <div style={{fontFamily:"'Syne',sans-serif",fontSize:13,fontWeight:700,color:"#d0e0f8",marginBottom:12}}>Renewal Integrity Controls</div>
          <div style={{background:"#0c1018",border:"1px solid #111825",borderRadius:2,overflow:"hidden"}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 80px 110px 65px",padding:"7px 20px",fontSize:9,color:"#1e2d45",letterSpacing:".1em",textTransform:"uppercase",borderBottom:"1px solid #111825"}}>
              <div>Control</div><div>Pass Rate</div><div>Failing/Total</div><div>Status</div>
            </div>
            {CONTROLS.filter(c=>c.category==="Renewal Integrity").map(c=>{
              const pr=passRate(c.failing,c.total);const st=statusOf(pr);const bc=st==="pass"?P:st==="warn"?W:F;
              return(
                <div key={c.id} style={{display:"grid",gridTemplateColumns:"1fr 80px 110px 65px",padding:"11px 20px",borderBottom:"1px solid #0d1118",alignItems:"center",fontSize:11}}>
                  <div><div style={{color:"#8aa0bc",marginBottom:2}}>{c.name}</div><div style={{fontSize:10,color:"#1e2d45"}}>{c.logic}</div></div>
                  <div><div style={{fontSize:12,fontWeight:600,color:bc}}>{pr}%</div><div className="pbar" style={{width:55}}><div className="pfill" style={{width:`${pr}%`,background:bc}}/></div></div>
                  <div style={{color:"#2d3d55"}}><span style={{color:c.failing>0?F:P}}>{c.failing.toLocaleString()}</span><span style={{color:"#1e2d45"}}> / {c.total.toLocaleString()}</span></div>
                  <div><span className={`bdg bdg-${st==="pass"?"p":st==="warn"?"w":"f"}`}>{st==="pass"?"PASS":st==="warn"?"WARN":"FAIL"}</span></div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── REVENUE BRIDGE TAB ── */}
      {tab==="revenue"&&(
        <div style={{padding:"24px 28px",overflowY:"auto",height:"calc(100vh - 185px)"}}>
          <div style={{fontFamily:"'Syne',sans-serif",fontSize:13,fontWeight:700,color:"#d0e0f8",marginBottom:14}}>MRR & ARR Reconciliation Bridge</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:22}}>
            {[
              {title:"MRR BRIDGE",rows:[["HS MRR (Active)",SUMMARY.hsTotalMRR,"#60a5fa",false],["CB MRR (Active Subs)",SUMMARY.cbTotalMRR,"#818cf8",false],["Delta",SUMMARY.cbTotalMRR-SUMMARY.hsTotalMRR,W,true],["Credit Notes Issued",-SUMMARY.totalCredits,F,true]]},
              {title:"ARR BRIDGE",rows:[["HS ARR (Active)",SUMMARY.hsTotalARR,"#60a5fa",false],["CB ARR (MRR×12)",SUMMARY.cbTotalARR,"#818cf8",false],["Delta",SUMMARY.cbTotalARR-SUMMARY.hsTotalARR,W,true]]},
            ].map(br=>(
              <div key={br.title} style={{background:"#0c1018",border:"1px solid #111825",borderRadius:2,padding:"20px"}}>
                <div style={{fontSize:9,color:"#1e2d45",letterSpacing:".1em",textTransform:"uppercase",marginBottom:14}}>{br.title}</div>
                {br.rows.map(([l,v,c,sign])=>(
                  <div key={l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:"1px solid #0d1118"}}>
                    <span style={{fontSize:11,color:"#4a6a88"}}>{l}</span>
                    <span style={{fontSize:13,fontWeight:600,color:c,fontFamily:"'Syne',sans-serif"}}>{sign&&v>0?"+":""}{fmtK(Math.abs(v))}{sign?(v>0?" ▲":" ▼"):""}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div style={{fontFamily:"'Syne',sans-serif",fontSize:13,fontWeight:700,color:"#d0e0f8",marginBottom:12}}>Revenue & Billing Controls</div>
          <div style={{background:"#0c1018",border:"1px solid #111825",borderRadius:2,overflow:"hidden"}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 80px 110px 65px",padding:"7px 20px",fontSize:9,color:"#1e2d45",letterSpacing:".1em",textTransform:"uppercase",borderBottom:"1px solid #111825"}}>
              <div>Control</div><div>Pass Rate</div><div>Failing/Total</div><div>Status</div>
            </div>
            {CONTROLS.filter(c=>["Revenue","Leakage","Billing"].includes(c.category)).map(c=>{
              const pr=passRate(c.failing,c.total);const st=statusOf(pr);const bc=st==="pass"?P:st==="warn"?W:F;
              return(
                <div key={c.id} style={{display:"grid",gridTemplateColumns:"1fr 80px 110px 65px",padding:"11px 20px",borderBottom:"1px solid #0d1118",alignItems:"center",fontSize:11}}>
                  <div>
                    <div style={{display:"inline-block",fontSize:9,color:CAT_COLORS[c.category],border:`1px solid ${CAT_COLORS[c.category]}22`,padding:"1px 5px",borderRadius:1,marginBottom:3}}>{c.category}</div>
                    <div style={{color:"#8aa0bc"}}>{c.name}</div>
                  </div>
                  <div><div style={{fontSize:12,fontWeight:600,color:bc}}>{pr}%</div><div className="pbar" style={{width:55}}><div className="pfill" style={{width:`${pr}%`,background:bc}}/></div></div>
                  <div style={{color:"#2d3d55"}}><span style={{color:c.failing>0?F:P}}>{c.failing.toLocaleString()}</span><span style={{color:"#1e2d45"}}> / {c.total.toLocaleString()}</span></div>
                  <div><span className={`bdg bdg-${st==="pass"?"p":st==="warn"?"w":"f"}`}>{st==="pass"?"PASS":st==="warn"?"WARN":"FAIL"}</span></div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
