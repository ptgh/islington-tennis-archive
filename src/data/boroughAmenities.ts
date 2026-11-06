import snapshot from './borough-amenities.json' with {type:'json'}

export const boroughAmenities=snapshot
const notedNames=['Highbury Fields','Barnard Park','Caledonian Park','Elthorne Park','Gillespie Park Nature Reserve','King Square Gardens','Paradise Park','Rosemary Gardens','Spa Fields','Whittington Park','Wray Crescent Open Space','Clissold Park','Tufnell Park Playing Fields','Arlington Square','Arundel Square','Culpeper Community Garden','Duncan Terrace Gardens','Islington Green','Joseph Grimaldi Park','New River Walk','St Mary Magdalene Gardens']
export const notedParks=snapshot.parks.filter(park=>notedNames.includes(park.name))
export function findBusStops(query:string,limit=60){
 const words=query.trim().toLowerCase().split(/\s+/).filter(Boolean)
 return snapshot.busStops.filter(stop=>words.every(word=>`${stop.name} ${stop.letter} ${stop.area}`.toLowerCase().includes(word))).slice(0,limit)
}
