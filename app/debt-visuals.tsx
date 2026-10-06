"use client";
import { Tabs } from "./ui";
import { useState } from "react";

const currency = new Intl.NumberFormat("en-PH",{style:"currency",currency:"PHP",maximumFractionDigits:2});
export const percentage = (value:number) => new Intl.NumberFormat("en-PH",{maximumFractionDigits:1}).format(value);
type Slice = { key:string; name:string; amount:number; percent:number; color:string };
type Overview = { remaining:number; reduced:number|null; percent:number|null; cleared:number; count:number; byDebt:Slice[]; byCategory:Slice[] };

export function ProgressRing({percent,color,completed=false,name}:{percent:number|null;color:string;completed?:boolean;name:string}){
  const value=completed?100:percent;
  return <div className="debt-progress-ring" role="img" aria-label={`${name}: ${value===null?"progress unavailable":`${percentage(value)}% cleared`}`}>
    <svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="42" className="ring-track"/>{value!==null&&<circle cx="50" cy="50" r="42" fill="none" stroke={color} strokeWidth="7" pathLength="100" strokeDasharray={`${value} 100`} transform="rotate(-90 50 50)"/>}</svg>
    <span aria-hidden="true">{value===null?"—":completed?"✓":`${percentage(value)}%`}<small>{value===null?"unavailable":"cleared"}</small></span>
  </div>;
}

function Donut({slices,total}:{slices:Slice[];total:number}){
  return <div className="debt-donut" role="img" aria-label={`Total remaining active debt ${currency.format(total)}. Breakdown listed alongside.`}>
    <svg viewBox="0 0 240 240" aria-hidden="true"><circle cx="120" cy="120" r="100" className="donut-track"/>{slices.map((slice,index)=>{const start=slices.slice(0,index).reduce((sum,item)=>sum+item.percent,0);return <circle key={slice.key} cx="120" cy="120" r="100" fill="none" stroke={slice.color} strokeWidth="24" pathLength="100" strokeDasharray={`${slice.percent} ${100-slice.percent}`} strokeDashoffset={-start} transform="rotate(-90 120 120)"/>;})}</svg>
    <div className="donut-center" aria-hidden="true"><span>TOTAL REMAINING<br/>DEBT</span><strong>{currency.format(total)}</strong></div>
  </div>;
}

export function DebtOverview({analytics,onCompleted}:{analytics:Overview;onCompleted:()=>void}){
  const [group,setGroup]=useState("debt");const slices=group==="debt"?analytics.byDebt:analytics.byCategory;
  return <Tabs.Root value={group} onValueChange={setGroup} asChild><section className="debt-overview" aria-label="Debt overview"><div className="overview-heading"><div><p className="eyebrow">DEBT OVERVIEW</p><h2>Where your debt sits</h2><p className="analytics-note">Actual balances today · not a future forecast</p></div><Tabs.List className="overview-segments" aria-label="Debt breakdown"><Tabs.Trigger value="debt">By debt</Tabs.Trigger><Tabs.Trigger value="category">By category</Tabs.Trigger></Tabs.List></div><Tabs.Content value={group}>
    {analytics.remaining>0?<div className="overview-layout"><Donut slices={slices} total={analytics.remaining}/><ul className="debt-legend" aria-label={group==="debt"?"Remaining balance by debt":"Remaining balance by category"}>{slices.map(slice=><li key={slice.key} aria-label={`${slice.name}: ${currency.format(slice.amount)}, ${percentage(slice.percent)}% of active debt`}><i style={{background:slice.color}} aria-hidden="true"/><div><strong>{slice.name}</strong><span>{currency.format(slice.amount)}</span></div><b>{percentage(slice.percent)}%</b></li>)}</ul></div>:<div className="debt-free"><h3>You’re debt-free 🎉</h3><p>No active balances to show.</p><button className="outline-button" onClick={onCompleted}>View completed debts</button></div>}
    </Tabs.Content><dl className="overview-metrics"><div><dt>Remaining</dt><dd>{currency.format(analytics.remaining)}</dd></div><div><dt>Balance reduced</dt><dd>{analytics.reduced===null?"Unavailable":currency.format(analytics.reduced)}</dd></div><div><dt>Overall progress</dt><dd>{analytics.percent===null?"Progress unavailable":`${percentage(analytics.percent)}%`}</dd></div><div><dt>Debts cleared</dt><dd>{analytics.cleared} of {analytics.count}</dd></div></dl>
  </section></Tabs.Root>;
}

export function DebtProgressTeaser({analytics}:{analytics:Overview}){
  return <article className="balance-card debt-progress-teaser"><p>DEBT PROGRESS</p><h2>{currency.format(analytics.remaining)}</h2><span className="teaser-caption">remaining · actual balance</span><div className="change">{analytics.percent===null?"Progress unavailable":`${percentage(analytics.percent)}% cleared`}</div>{analytics.percent!==null&&<div className="real-progress" role="progressbar" aria-label="Overall debt cleared" aria-valuemin={0} aria-valuemax={100} aria-valuenow={analytics.percent}><i style={{width:`${analytics.percent}%`}}/></div>}<p className="teaser-wins">{analytics.cleared} of {analytics.count} debts cleared</p><a className="text-button" href="/debts">View debts →</a></article>;
}
