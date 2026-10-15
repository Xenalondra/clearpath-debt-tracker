"use client";
import { useRef, useState } from "react";
import { X } from "lucide-react";
import { Popover } from "./ui";

export type BalanceSlice = {key:string;name:string;amount:number;percent:number;color:string};
export const chartCurrency = new Intl.NumberFormat("en-PH",{style:"currency",currency:"PHP",maximumFractionDigits:2});
const share = (value:number) => new Intl.NumberFormat("en-PH",{maximumFractionDigits:1}).format(value);

export function ChartLegend({slices,label,selected,onSelect}:{slices:BalanceSlice[];label:string;selected:string|undefined;onSelect:(slice:BalanceSlice,element:HTMLElement|SVGElement)=>void}){
  return <ul className="debt-legend" aria-label={label}>{slices.map(slice=><li key={slice.key}><button type="button" aria-pressed={selected===slice.key} onClick={event=>onSelect(slice,event.currentTarget)}><i style={{background:slice.color}} aria-hidden="true"/><span><strong>{slice.name}</strong><span className="legend-values">{chartCurrency.format(slice.amount)} <b>{share(slice.percent)}%</b></span></span></button></li>)}</ul>;
}

// One read-only interaction system for SVG segments and legend buttons.
export function BalanceDonut({slices,total,label,context,legendLabel}:{slices:BalanceSlice[];total:number;label:string;context:string;legendLabel:string}){
  const [selected,setSelected]=useState<BalanceSlice|null>(null);
  const trigger=useRef<HTMLElement|SVGElement|null>(null);
  const chart=useRef<HTMLDivElement|null>(null);
  function select(slice:BalanceSlice,element:HTMLElement|SVGElement){trigger.current=element;setSelected(slice);}
  return <Popover.Root open={selected!==null} onOpenChange={open=>{if(!open)setSelected(null);}}><div className="overview-layout" ref={chart}>
    <Popover.Anchor asChild><div className="debt-donut">
      <svg viewBox="0 0 240 240" role="group" aria-label={`${label}: ${chartCurrency.format(total)}. ${context}`}><circle cx="120" cy="120" r="100" className="donut-track"/>{slices.map((slice,index)=>{const start=slices.slice(0,index).reduce((sum,item)=>sum+item.percent,0);return <circle key={slice.key} cx="120" cy="120" r="100" fill="none" stroke={slice.color} strokeWidth="24" pathLength="100" strokeDasharray={`${slice.percent} ${100-slice.percent}`} strokeDashoffset={-start} transform="rotate(-90 120 120)" role="button" tabIndex={0} aria-label={`${slice.name}: ${chartCurrency.format(slice.amount)}, ${share(slice.percent)}%. ${context}`} aria-pressed={selected?.key===slice.key} onClick={event=>select(slice,event.currentTarget)} onKeyDown={event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();select(slice,event.currentTarget);}}}/>;})}</svg>
      <div className="donut-center" aria-hidden="true"><span>{label}</span><strong>{chartCurrency.format(total)}</strong></div>
    </div></Popover.Anchor>
    <ChartLegend slices={slices} label={legendLabel} selected={selected?.key} onSelect={select}/>
  </div><Popover.Portal><Popover.Content className="chart-details" side="bottom" align="center" sideOffset={8} collisionPadding={{top:16,right:16,bottom:112,left:16}} aria-label="Balance details" onInteractOutside={event=>{if(event.target instanceof Node&&chart.current?.contains(event.target))event.preventDefault();}} onCloseAutoFocus={event=>{event.preventDefault();trigger.current?.focus();}}>
    {selected&&<><i style={{background:selected.color}} aria-hidden="true"/><div><strong>{selected.name}</strong><p>{context}</p><b>{chartCurrency.format(selected.amount)}</b><span>{share(selected.percent)}% of total</span></div><Popover.Close className="icon-button" aria-label="Close balance details"><X size={18}/></Popover.Close></>}
  </Popover.Content></Popover.Portal></Popover.Root>;
}
