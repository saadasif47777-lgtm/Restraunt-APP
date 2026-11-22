'use client'
import {useEffect,useState} from 'react'
import {Search,Utensils} from 'lucide-react'
import {api} from '../admin-workspace/api'
import type {Draft} from '../admin-workspace/menu/types'
type Menu=Draft&{restaurant:string;branch:string;table:string;currency:string}
export function MenuView({menu}:{menu:Menu}){
 const [category,set]=useState('All');const [q,search]=useState('')
 return <div className="guest"><small>{menu.branch} · {menu.table}</small><h1>{menu.restaurant}</h1><div className="search"><Search size={16}/><input aria-label="Search menu" placeholder="Search menu..." value={q} onChange={e=>search(e.target.value)}/></div><div className="chips">{['All',...menu.categories].map(c=><button className={category===c?'active':''} key={c} onClick={()=>set(c)}>{c}</button>)}</div>{menu.dishes.filter(d=>!d.archived&&(category==='All'||d.category===category)&&d.name.toLowerCase().includes(q.toLowerCase())).map(d=><details key={d.id}><summary>{d.photo?<img src={d.photo} alt=""/>:<Utensils/>}<span><strong>{d.name}</strong><small>{d.available?d.category:'Sold out'}</small></span><b>{menu.currency} {d.portions[0]?.price??'—'}</b></summary><p dir="auto">{d.description}</p>{d.deal&&<p><strong>Deal</strong> · {d.deal}</p>}{d.portions.map(p=><p key={p.name}>{p.name} · {menu.currency} {p.price??'—'}</p>)}{Object.entries(d.modifiers).map(([g,ps])=><p key={g}>{g} · {ps.map(p=>p.name+' +'+p.price).join(', ')}</p>)}<p>{d.spice} {d.allergens.length?' · Contains '+d.allergens.join(', '):''}</p></details>)}</div>
}
export default function CustomerMenuScreen({table}:{table:string}){
 const [menu,set]=useState<Menu>();const [error,fail]=useState('')
 useEffect(()=>{api('/menu/'+encodeURIComponent(table)).then(set).catch(e=>fail(e.message))},[table])
 return menu?<MenuView menu={menu}/>:<main className="guest">{error||'Loading menu…'}</main>
}
