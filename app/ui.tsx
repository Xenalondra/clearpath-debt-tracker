"use client";
/* eslint-disable react-hooks/set-state-in-effect */
import { InputHTMLAttributes, ReactNode, useEffect, useState } from "react";
import { Dialog, AlertDialog, DropdownMenu, RadioGroup, Tabs } from "radix-ui";
export { Dialog, AlertDialog, RadioGroup, Tabs };

type NumericProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "defaultValue" | "onChange"> & { value?:string|number; defaultValue?:string|number; onChange?:(event:React.ChangeEvent<HTMLInputElement>)=>void; integer?:boolean; onCommit?:(value:number)=>void };
export function NumericInput({value,defaultValue,onChange,onCommit,integer=false,min,max,...props}:NumericProps){
  const [draft,setDraft]=useState(String(value??defaultValue??""));
  useEffect(()=>{if(value!==undefined)setDraft(String(value));},[value]);
  useEffect(()=>{if(value===undefined&&defaultValue!==undefined)setDraft(String(defaultValue));},[defaultValue,value]);
  return <input {...props} type="text" inputMode={integer?"numeric":"decimal"} placeholder={integer?"0":"0.00"} value={draft} onFocus={event=>{event.currentTarget.select();props.onFocus?.(event);}} onChange={event=>{const next=event.target.value;if(!(integer?/^\d*$/:/^\d*(\.\d{0,2})?$/).test(next))return;setDraft(next);onChange?.(event);event.currentTarget.setCustomValidity("");}} onBlur={event=>{const number=Number(draft);const valid=draft!==""&&Number.isFinite(number)&&(min===undefined||number>=Number(min))&&(max===undefined||number<=Number(max));event.currentTarget.setCustomValidity(draft===""&&!props.required?"":valid?"":`Enter ${integer?"a whole number":"an amount"}${min!==undefined?` of at least ${min}`:""}${max!==undefined?` and no more than ${max}`:""}.`);if(valid)onCommit?.(number);props.onBlur?.(event);}}/>;
}
export function ActionMenu({label,children}:{label:string;children:ReactNode}){return <DropdownMenu.Root modal={false}><DropdownMenu.Trigger className="menu-trigger" aria-label={label}>⋯</DropdownMenu.Trigger><DropdownMenu.Portal><DropdownMenu.Content className="shared-menu" sideOffset={6} collisionPadding={12}>{children}</DropdownMenu.Content></DropdownMenu.Portal></DropdownMenu.Root>;}
export const MenuItem=DropdownMenu.Item;
export function Confirmation({title,description,onConfirm,children}:{title:string;description:string;onConfirm:()=>void;children:ReactNode}){return <AlertDialog.Root><AlertDialog.Trigger asChild>{children}</AlertDialog.Trigger><AlertDialog.Portal><AlertDialog.Overlay className="modal-backdrop"/><AlertDialog.Content className="confirmation"><AlertDialog.Title>{title}</AlertDialog.Title><AlertDialog.Description>{description}</AlertDialog.Description><div className="confirm-actions"><AlertDialog.Cancel>Cancel</AlertDialog.Cancel><AlertDialog.Action onClick={onConfirm}>Confirm</AlertDialog.Action></div></AlertDialog.Content></AlertDialog.Portal></AlertDialog.Root>;}
