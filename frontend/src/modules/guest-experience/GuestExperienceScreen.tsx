'use client'
import {useState} from 'react'
import Frame from '../PreviewWorkspace'
import {data} from './data'
export default function GuestExperienceScreen(){
const [rating,set]=useState(0),[done,save]=useState(false),[answer,choose]=useState('');return <Frame title="Guest experience"><section><h2>Guest Wi-Fi</h2><p>{data.wifi}</p></section><section><h2>Visit feedback</h2><label>Rating<select value={rating} onChange={e=>set(+e.target.value)}><option value={0}>Select a rating</option>{[1,2,3,4,5].map(n=><option key={n}>{n}</option>)}</select></label><button disabled={!rating||done} onClick={()=>save(true)}>Save sample feedback</button>{done&&<p>Feedback saved in this preview.</p>}</section><section><h2>Rewards quiz</h2><p>Which oven is used for naan?</p>{['Tandoor','Smoker'].map(a=><button onClick={()=>choose(a)} key={a}>{a}</button>)}{answer&&<p>{answer==='Tandoor'?'Correct · 10 preview points':'Try another answer'}</p>}</section></Frame>
}
