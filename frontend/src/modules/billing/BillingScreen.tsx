'use client'
import {useState} from 'react'
import Frame from '../PreviewWorkspace'
import {data} from './data'
export default function BillingScreen(){
const [tip,setTip]=useState(0),[discount,reduce]=useState(0),[shares,split]=useState(1),[paid,pay]=useState(0),[method,choose]=useState('Cash'),[closed,close]=useState(false);const total=Math.max(0,1130-discount+tip),balance=Math.max(0,total-paid)
return <Frame title="Billing"><section><h2>{closed?'Sample receipt':'Itemized bill'}</h2><p>{data.item} · PKR 950</p><p>Garlic Naan · PKR 180</p>{!closed&&<><label>Discount<input type="number" min={0} max={1130} disabled={paid>0} value={discount} onChange={e=>reduce(Math.max(0,Math.min(1130,+e.target.value)))}/></label><label>Optional tip<input type="number" min={0} disabled={paid>0} value={tip} onChange={e=>setTip(Math.max(0,+e.target.value))}/></label><label>Split shares<select value={shares} onChange={e=>split(+e.target.value)}>{[1,2,3,4].map(n=><option key={n}>{n}</option>)}</select></label><label>Payment method<select value={method} onChange={e=>choose(e.target.value)}>{['Cash','Terminal','Online'].map(m=><option key={m}>{m}</option>)}</select></label></>}<h3>Remaining · PKR {balance.toFixed(2)}</h3><p>{closed?'Preview visit closed':balance?'Awaiting preview payment':'Preview balance settled'}</p>{balance>0?<button onClick={()=>pay(Math.min(total,paid+Math.ceil(total/shares*100)/100))}>Record sample {method.toLowerCase()} share</button>:!closed&&<button onClick={()=>close(true)}>Close sample visit</button>}</section></Frame>
}
