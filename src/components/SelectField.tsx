import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import './SelectField.css';

type Choice = { value: string; label: string };
/** A compact, keyboard-operated listbox whose menu stays within the viewport. */
export function SelectField({label,value,options,onChange,placeholder='Choose an option'}:{label:string;value:string;options:Choice[];onChange:(value:string)=>void;placeholder?:string}) {
  const id=useId(), trigger=useRef<HTMLButtonElement>(null), menu=useRef<HTMLDivElement>(null);
  const [open,setOpen]=useState(false),[active,setActive]=useState(0);
  const [position,setPosition]=useState({left:0,top:0,width:0,maxHeight:240});
  const typing=useRef({text:'',time:0});
  const selected=options.findIndex(option=>option.value===value);
  function close(restore=false){setOpen(false);if(restore)trigger.current?.focus();}
  function show(){setActive(Math.max(0,selected));setOpen(true);}
  function choose(index:number){if(options[index])onChange(options[index].value);close(true);}
  useEffect(()=>{
    if(!open)return;
    const update=()=>{const r=trigger.current?.getBoundingClientRect();if(!r)return;const below=window.innerHeight-r.bottom-16,above=r.top-16;const height=Math.min(264,Math.max(below,above),options.length*42+12);const down=below>=height||below>=above;setPosition({left:Math.max(12,Math.min(r.left,window.innerWidth-r.width-12)),top:down?r.bottom+8:r.top-height-8,width:r.width,maxHeight:height});};
    update();menu.current?.focus({preventScroll:true});
    const outside=(event:PointerEvent)=>{if(!menu.current?.contains(event.target as Node)&&!trigger.current?.contains(event.target as Node))close();};
    const scroll=(event:Event)=>{if(!menu.current?.contains(event.target as Node))close();};
    document.addEventListener('pointerdown',outside);window.addEventListener('resize',update);document.addEventListener('scroll',scroll,true);
    return()=>{document.removeEventListener('pointerdown',outside);window.removeEventListener('resize',update);document.removeEventListener('scroll',scroll,true);};
  },[open,options.length]);
  useEffect(()=>{if(open)menu.current?.querySelector(`#${CSS.escape(id)}-option-${active}`)?.scrollIntoView({block:'nearest'});},[active,open,id]);
  function keys(event:KeyboardEvent){
    if(event.key==='Escape'){event.preventDefault();close(true);return;}
    if(event.key==='Tab'){close();trigger.current?.focus();return;}
    if(event.key==='Enter'||event.key===' '){event.preventDefault();if(open)choose(active);else show();return;}
    const navigation=['ArrowDown','ArrowUp','Home','End'];
    if(navigation.includes(event.key)){event.preventDefault();if(!open){show();return;}setActive(i=>event.key==='Home'?0:event.key==='End'?options.length-1:Math.max(0,Math.min(options.length-1,i+(event.key==='ArrowDown'?1:-1))));return;}
    if(event.key.length===1&&!event.ctrlKey&&!event.metaKey){event.preventDefault();const now=Date.now();typing.current.text=(now-typing.current.time>700?'':typing.current.text)+event.key.toLowerCase();typing.current.time=now;const index=options.findIndex(o=>o.label.toLowerCase().startsWith(typing.current.text));if(index>=0){if(!open)setOpen(true);setActive(index);}}
  }
  return <div className="select-field"><span id={`${id}-label`} className="select-field__label">{label}</span><button ref={trigger} type="button" className="select-field__trigger" aria-haspopup="listbox" aria-expanded={open} aria-controls={open?id:undefined} aria-labelledby={`${id}-label ${id}-value`} onKeyDown={keys} onClick={()=>open?close():show()}><span id={`${id}-value`}>{options[selected]?.label??placeholder}</span><svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg></button>{open&&createPortal(<div ref={menu} id={id} className="select-field__menu" role="listbox" tabIndex={-1} aria-labelledby={`${id}-label`} aria-activedescendant={`${id}-option-${active}`} style={position} onKeyDown={keys}>{options.map((option,index)=><div id={`${id}-option-${index}`} key={option.value} role="option" aria-selected={value===option.value} data-active={active===index} className="select-field__option" onPointerMove={()=>setActive(index)} onClick={()=>choose(index)}><span>{option.label}</span>{value===option.value&&<span aria-hidden="true">✓</span>}</div>)}</div>,document.body)}</div>;
}
