"use client";
import { useEffect, useRef } from "react";
import { Toaster, toast } from "sonner";
import { CircleCheck, CircleAlert, Info, X } from "lucide-react";

export type AppNotification={message:string;variant?:"success"|"error"|"info";transactionId?:number};

// One Sonner primitive/wrapper for every app notification. Financial state and
// Undo remain in PlannerProvider; this component owns presentation only.
export function AppToast({notification,onDismiss,onUndo}:{notification:AppNotification|null;onDismiss:()=>void;onUndo:()=>void}){
 const handlers=useRef({onDismiss,onUndo});handlers.current={onDismiss,onUndo};
 useEffect(()=>{
  if(!notification){toast.dismiss("clearpath-notice");return;}
  toast[notification.variant??"success"](<span role="status">{notification.message}</span>,{
   id:"clearpath-notice",duration:Infinity,
   action:notification.transactionId?{label:"Undo",onClick:()=>handlers.current.onUndo()}:undefined,
   onDismiss:()=>handlers.current.onDismiss(),
  });
 },[notification]);
 useEffect(()=>()=>{toast.dismiss("clearpath-notice");},[]);
 return <Toaster className="clearpath-toaster" theme="light" position="bottom-center" visibleToasts={1} closeButton
  icons={{success:<CircleCheck size={20}/>,error:<CircleAlert size={20}/>,info:<Info size={20}/>,close:<X size={18}/>}}
  toastOptions={{unstyled:true,closeButtonAriaLabel:"Dismiss notification",classNames:{toast:"app-snackbar",content:"app-snackbar-content",title:"app-snackbar-title",closeButton:"app-snackbar-close",actionButton:"app-snackbar-action",icon:"app-snackbar-icon"}}}/>;
}
