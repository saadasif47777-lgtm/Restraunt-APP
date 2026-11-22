import {Users} from 'lucide-react'
import type {Workspace} from '../menu/types'
export default function StaffMembers({w,invite}:{w:Workspace;invite:()=>void}){return <>{w.role==='owner'&&<button className="primary" onClick={invite}>Invite staff</button>}{w.staff.map((s,i)=><div className="record" key={i}><Users size={17}/>{s.email}<small>{s.role}</small></div>)}</>}
