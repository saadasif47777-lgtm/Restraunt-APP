import Screen from '@/modules/customer-menu/CustomerMenuScreen'
export default async function Page({params}:{params:Promise<{table:string}>}){return <Screen table={(await params).table}/>}
