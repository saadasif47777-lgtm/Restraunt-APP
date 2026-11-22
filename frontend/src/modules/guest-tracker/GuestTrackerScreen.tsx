'use client'
import {useState} from 'react'
import Frame from '../PreviewWorkspace'
import {data} from './data'
export default function GuestTrackerScreen(){
const [request,set]=useState(''),[stage,advance]=useState(0);const states=['Received','Preparing','Ready']
return <Frame title="Guest tracker"><section><small>Round 1</small><h2>{states[stage]}</h2><div className="record">{data.item}<b>{states[stage]}</b></div><div className="record">Garlic Naan<b>{stage===2?'Ready':'Preparing'}</b></div><p>Estimated wait · {stage===2?'Ready now':'12 minutes'}</p><button onClick={()=>advance((stage+1)%3)}>Advance preview</button></section><section><h2>Service requests</h2>{['Water','Napkins','Help','Bill'].map(s=><button key={s} onClick={()=>set(s)}>{s}</button>)}{request&&<p>{request} request acknowledged in preview.</p>}</section></Frame>
}
