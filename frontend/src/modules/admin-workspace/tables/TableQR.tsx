import QRCode from 'qrcode'
import {useEffect,useState} from 'react'
export default function TableQR({id,label,preview}:{id:string;label:string;preview:boolean}){
 const [src,set]=useState('')
 useEffect(()=>{if(!preview)QRCode.toDataURL(location.origin+'/menu/'+id,{width:384,margin:4}).then(set)},[id,preview])
 return <div className="qr"><h3>{label}</h3>{src?<><img src={src} alt={'Menu QR for '+label}/><button onClick={()=>window.print()}>Print QR</button></>:<small>{preview?'Sign in to print a live table QR.':'Generating QR…'}</small>}</div>
}
