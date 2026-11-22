'use client'
import {useState} from 'react'
import Frame from '../PreviewWorkspace'
import {data} from './data'
export default function TableOrderingScreen(){
const [joined,join]=useState(false),[qty,count]=useState(1),[note,write]=useState(''),[portion,choose]=useState(0),[extra,add]=useState(false),[done,submit]=useState(false)
return <Frame title="Table ordering"><section>{!joined?<button className="primary" onClick={()=>join(true)}>Join sample visit</button>:done?<><h2>Round recorded in preview</h2><button onClick={()=>{submit(false);count(1);write('')}}>Add second round</button></>:<><h2>{data.item}</h2><label>Portion<select value={portion} onChange={e=>choose(+e.target.value)}><option value={0}>Half · PKR 950</option><option value={1}>Full · PKR 1,700</option></select></label><label><input type="checkbox" checked={extra} onChange={e=>add(e.target.checked)}/> Extra ginger · PKR 50</label><label>Quantity<input type="number" min={0} max={99} value={qty} onChange={e=>count(Math.min(99,Math.max(0,+e.target.value)))}/></label><label>Kitchen notes<textarea value={note} onChange={e=>write(e.target.value)}/></label><h3>Cart total · PKR {qty*((portion?1700:950)+(extra?50:0))}</h3><button className="primary" disabled={!qty} onClick={()=>submit(true)}>Submit preview round</button></>}</section></Frame>
}
