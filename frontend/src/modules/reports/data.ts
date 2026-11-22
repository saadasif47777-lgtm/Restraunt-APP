export interface Shift {branch:string;day:string;totals:Record<string,string>}
export const data:{shifts:Shift[]}={shifts:['Gulberg','DHA'].map((branch,i)=>({branch,day:'2026-11-22',totals:{Cash:i?'PKR 4,200':'PKR 5,350',Terminal:'PKR 7,600',Online:'PKR 950',Voids:'1 · PKR 180','Popular dish':'Chicken Karahi','Kitchen time':'14 min','Service time':'4 min'}}))}
