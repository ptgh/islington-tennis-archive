export function parseFavourites(raw:string|null,validIds:string[]):string[]{
  try {const value:unknown=JSON.parse(raw??'[]');return Array.isArray(value)?[...new Set(value.filter((id):id is string=>typeof id==='string'&&validIds.includes(id)))]:[];}catch{return [];}
}
