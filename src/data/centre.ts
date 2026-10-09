export const CENTRE_SOURCE='https://www.better.org.uk/leisure-centre/london/islington/islingtontc/tennis';
export const centreCoaches = [
  ['Mukember Musa',4,'07908 442 711','All ages and levels'],
  ['Leon Achille',4,'07958 753 839','All ages and levels'],
  ['Stella Cayer',4,'07843 382 423','All ages and levels'],
  ['Suzie Chapman',4,'07738 126 398','Beginners, intermediate and juniors'],
  ['Scott Gorman',4,'07950 455 950','Beginners and intermediate'],
  ['Callum Arundel-Thomson',3,'07818 398 776','All ages and levels'],
  ['Yiannakis Papapetrou',3,'07572 440 622','Beginners and intermediate'],
  ['Sofia Conte',3,'07412 381 854','Beginners, intermediate and juniors'],
  ['James Wells',3,'07950 315 939','Beginners and intermediate'],
  ['Peter Albertelli',3,'07941 121 176','Beginners and intermediate'],
  ['Konstantinos Gogos',3,'07801 845 206','Performance juniors; adults of all levels'],
  ['Rodrigo Sanchez',3,'07710 991 350','Beginners, intermediate and juniors'],
  ['David Vellala',3,'07770 626 970','Beginners, intermediate, juniors and disability tennis'],
  ['Wesley Samuel',3,'07715 902 287','Beginners and intermediate'],
].map(([name,level,phone,specialism])=>({name:String(name),level:Number(level),phone:String(phone),specialism:String(specialism)}));
export const centreSessions = [
  {name:'Adult courses',note:'Levels 1–4. Sunday’s level 3 is labelled “Advanced” by Better; confirm placement. Published course times, subject to change.',rows:[
    ['Mon','08–09 Beginner · 19–20 Beginner · 20–21 Intermediate'],
    ['Tue','07–08 Intermediate · 19–20 Beginner · 20–21 Intermediate · 21–22 Advanced intermediate'],
    ['Wed','08–09 Intermediate · 09–10 Women-only beginner'],
    ['Thu','08–09 Advanced · 09–10 Intermediate · 19–20 Beginner · 20–21 Intermediate · 21–22 Advanced'],
    ['Fri','08–09 Beginner · 09–10 Intermediate'],['Sat','11–12 Intermediate · 14–15 Beginner'],['Sun','09–10 Level 3 · 11–12 Intermediate']]},
  {name:'Junior courses',note:'Age bands conflict between Better’s descriptions and timetable for Tots, Orange and Green. Confirm the right group with the centre.',rows:[
    ['Tots','Tue / Thu 16:00–16:30 or 16:30–17:00'],
    ['Red · 5–8','Mon / Tue / Thu 16–17; Sat / Sun 10–11'],
    ['Orange','Mon 16–17; Tue / Thu 17–18; Sat 11–12'],
    ['Green','Tue / Thu 18–19; Sat 09–10'],
    ['Teen · 11+','Fri 17–18 beginners; Sat 12–13; Sun 10–11']]},
  {name:'Social doubles',note:'Pay as you go. Intermediate play recommended. Balls supplied; ask to borrow a racket. Check spaces and prices with Better.',rows:[['Mon · 50+','14–16'],['Tue','10–12'],['Wed · 50+','12–14'],['Fri','13–15'],['Sat / Sun','19–22']]},
  {name:'Casual coaching',note:'Thursday pay-as-you-go coaching. Confirm current prices and availability with Better.',rows:[['Advanced','Thu 12:00–13:30'],['Beginners / improvers','Thu 13:30–15:00']]},
];
