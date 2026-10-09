/** An editorial selection, not a live product feed or a claim about pro custom frames. */
export type Racquet = {
  id: string
  name: string
  family: string
  era: 'current' | 'archive'
  period: string
  character: string
  note: string
  source: string
  image?: string
  frame: string
  accent: string
}

const history = 'https://www.wilson.com/en-us/blog/tennis/wilson-labs/wilson-pro-staff-history'
const photo = (path: string) => `https://www.wilson.com/en-gb/media/catalog/product/article_images/${path}?fit=bounds&orient=1&quality=95&optimize=high&format=pjpeg&auto=webp&enable=upscale&canvas=9%3A11&bg-color=F3F1ED&width=428`
const historyPhoto = (path: string, format: 'jpg' | 'png') => `https://www.wilson.com/en-us/blog/tennis/wilson-labs/${path}?format=${format}&optimize=medium&width=750`

export const racquets: Racquet[] = [
  { id:'pro-staff-classic', name:'Pro Staff 97 Classic', family:'Pro Staff', era:'current', period:'Classic', character:'Precision & feel', note:'The current Classic revisits the Pro Staff character: direct feedback and a precise response.', source:'https://www.wilson.com/en-gb/product/pro-staff-97-classic-wr20130', image:photo('WR201311U_/WR201311U__31b21f8bfa1d858ce76a23f05be5d64f.png'), frame:'#3d3833', accent:'#caa57a' },
  { id:'pro-staff-classic-97l', name:'Pro Staff 97L Classic', family:'Pro Staff', era:'current', period:'Classic', character:'Lighter feel', note:'A lighter 97L variation in Wilson’s current Pro Staff Classic family.', source:'https://www.wilson.com/en-gb/product/pro-staff-97l-classic-wr20140', image:photo('WR201411U_/WR201411U__a8464a724d677baf10f489d432970956.png'), frame:'#3d3833', accent:'#caa57a' },
  { id:'blade-v10', name:'Blade 98 16×19 V10', family:'Blade', era:'current', period:'V10', character:'Control · 16×19', note:'The open-pattern Blade 98 in Wilson’s current control-led range.', source:'https://www.wilson.com/en-gb/product/blade-98-16x19-v10-wr20780', image:photo('WR207811U_/WR207811U__5036c899fad5cbecbca1b6872823e9f0.png'), frame:'#345b4f', accent:'#97bb9c' },
  { id:'blade-v10-tiger', name:'Tiger Blade 98 16×19 V10', family:'Blade', era:'current', period:'V10 limited', character:'Sabalenka edition', note:'A limited Blade 98 16×19 colourway designed with and inspired by Aryna Sabalenka.', source:'https://www.wilson.com/en-gb/product/tiger-blade-98-16x19-v10-frm-wrp00032', image:photo('WRP00032011U/WRP00032011U_8e3e57589d43b089e9dc3e54a21c371a.png'), frame:'#345b4f', accent:'#d3846b' },
  { id:'blade-v10-18x20', name:'Blade 98 18×20 V10', family:'Blade', era:'current', period:'V10', character:'Control · 18×20', note:'The denser 18×20 string-pattern alternative to the Blade 98 16×19.', source:'https://www.wilson.com/en-gb/product/blade-98-18x20-v10-wr20790', image:photo('WR207911U_/WR207911U__e757b934f6026279b0718893f34088c5.png'), frame:'#345b4f', accent:'#97bb9c' },
  { id:'blade-v10-98s', name:'Blade 98S V10', family:'Blade', era:'current', period:'V10', character:'Spin pattern', note:'The Blade 98S is a distinct spin-oriented variation in the V10 line.', source:'https://www.wilson.com/en-gb/product/blade-98s-v10-wr20800', image:photo('WR208011U_/WR208011U__1c1a921bc4bb954032926a3a3714e362.png'), frame:'#345b4f', accent:'#97bb9c' },
  { id:'blade-v10-98-pro-16x19', name:'Blade 98 Pro 16×19 V10', family:'Blade', era:'current', period:'V10 Pro', character:'Pro · 16×19', note:'One of two Blade 98 Pro V10 string-pattern choices listed by Wilson.', source:'https://www.wilson.com/en-gb/product/blade-98-pro-16x19-v10-wr20760', image:photo('WR207611U_/WR207611U__fab74fedf9d3b1991c6b5b8f41156cb2.png'), frame:'#345b4f', accent:'#97bb9c' },
  { id:'blade-v10-98-pro-18x20', name:'Blade 98 Pro 18×20 V10', family:'Blade', era:'current', period:'V10 Pro', character:'Pro · 18×20', note:'The denser-pattern Blade 98 Pro V10 variation.', source:'https://www.wilson.com/en-gb/product/blade-98-pro-18x20-v10-wr20770', image:photo('WR207711U_/WR207711U__9f77e993c02eeb30787f3bfec6f14269.png'), frame:'#345b4f', accent:'#97bb9c' },
  { id:'blade-v10-100', name:'Blade 100 V10', family:'Blade', era:'current', period:'V10', character:'100 sq in', note:'A larger-head Blade in the same current V10 family.', source:'https://www.wilson.com/en-gb/product/blade-100-v10-wr20820', image:photo('WR208211U_/WR208211U__85916256a8bac37742934a91ff8307b4.png'), frame:'#345b4f', accent:'#97bb9c' },
  { id:'blade-v10-100-pro', name:'Blade 100 Pro V10', family:'Blade', era:'current', period:'V10 Pro', character:'100 Pro', note:'Wilson also lists a Blade 100 Pro alongside the Blade 98 Pro frames.', source:'https://www.wilson.com/en-gb/product/blade-100-pro-v10-wr20810', image:photo('WR208111U_/WR208111U__b2a3c91d57adc9f25eb1dd2ce95fe2bb.png'), frame:'#345b4f', accent:'#97bb9c' },
  { id:'blade-v10-100l', name:'Blade 100L V10', family:'Blade', era:'current', period:'V10', character:'Lighter 100', note:'The lighter Blade 100L is a separate current V10 model.', source:'https://www.wilson.com/en-gb/product/blade-100l-v10-wr20830', image:photo('WR208311U_/WR208311U__860fe42bc77b119590a94e4ce532d96d.png'), frame:'#345b4f', accent:'#97bb9c' },
  { id:'blade-v10-100ul', name:'Blade 100UL V10', family:'Blade', era:'current', period:'V10', character:'Ultra-light 100', note:'Wilson lists an ultra-light 100UL alongside the Blade 100L.', source:'https://www.wilson.com/en-gb/product/blade-100ul-v10-rkt-ecom-wrp00005', image:photo('WRP00005010U/WRP00005010U_8ce2b0ebb1802c937a53adbfb4d0d804.png'), frame:'#345b4f', accent:'#97bb9c' },
  { id:'blade-v10-104', name:'Blade 104 V10', family:'Blade', era:'current', period:'V10', character:'104 sq in', note:'An extended larger-head variation of the current Blade V10.', source:'https://www.wilson.com/en-gb/product/blade-104-v10-wr20850', image:photo('WR208511U_/WR208511U__4b0b74efd0c06e9ee131781bd0c75f41.png'), frame:'#345b4f', accent:'#97bb9c' },
  { id:'clash-v3', name:'Clash 100 V3', family:'Clash', era:'current', period:'V3', character:'Flexible feel', note:'Clash pairs a flexible response with an accessible 100-square-inch head.', source:'https://www.wilson.com/en-gb/product/clash-100-v3-0-frm-wr17280', image:photo('WR172811U_/WR172811U__802dcd3540332b169b557739efda665a.png'), frame:'#4b3430', accent:'#d78d75' },
  { id:'clash-v3-pro', name:'Clash 100 Pro V3', family:'Clash', era:'current', period:'V3 Pro', character:'Pro feel', note:'The 100 Pro is a separate frame in Wilson’s Clash V3 line.', source:'https://www.wilson.com/en-gb/product/clash-100-pro-v3-0-frm-wr17270', image:photo('WR172711U_/WR172711U__ef49c0541dc830c48c4702248438b581.png'), frame:'#4b3430', accent:'#d78d75' },
  { id:'clash-v3-100l', name:'Clash 100L V3', family:'Clash', era:'current', period:'V3', character:'Lighter 100', note:'A lighter 100L variation of Wilson’s Clash V3.', source:'https://www.wilson.com/en-gb/product/clash-100l-v3-0-frm-wr17290', image:photo('WR172911U_/WR172911U__166a04d829ef68d441f21e4bc7a85686.png'), frame:'#4b3430', accent:'#d78d75' },
  { id:'ultra-v5', name:'Ultra 100 V5', family:'Ultra', era:'current', period:'V5', character:'Power', note:'Wilson’s current Ultra 100 sits in its power-led family.', source:'https://www.wilson.com/en-gb/product/ultra-100-v5-wr17880', image:photo('WR178811U_/WR178811U__3dd655fc557588b0664adf5199b6901a.png'), frame:'#425d9a', accent:'#9cc2dd' },
  { id:'ultra-v5-99-pro', name:'Ultra 99 Pro V5', family:'Ultra', era:'current', period:'V5 Pro', character:'99 Pro', note:'The 99 Pro is a distinct current Ultra V5 frame.', source:'https://www.wilson.com/en-gb/product/ultra-99-pro-v5-frm-wr17870', image:photo('WR178711U_/WR178711U__fc825f1bbb64cae6a4229d3eb843d542.png'), frame:'#425d9a', accent:'#9cc2dd' },
  { id:'ultra-v5-100l', name:'Ultra 100L V5', family:'Ultra', era:'current', period:'V5', character:'Lighter power', note:'The lighter Ultra 100L V5 is a separate power-family option.', source:'https://www.wilson.com/en-gb/product/ultra-100l-v5-wr17890', image:photo('WR178911U_/WR178911U__6ac5ee6c0076324f33d2db2c6d551bd4.png'), frame:'#425d9a', accent:'#9cc2dd' },
  { id:'shift-v1', name:'Shift 99 V1', family:'Shift', era:'current', period:'V1', character:'Spin', note:'The Shift 99 is presented by Wilson for players seeking spin and depth.', source:'https://www.wilson.com/en-gb/product/shift-99-v1-wr14530', image:photo('WR145311U_/WR145311U__7092ab0f07dcf028c17f84710dee694b.png'), frame:'#d5d0c1', accent:'#a4b4a4' },
  { id:'shift-v1-pro', name:'Shift 99 Pro V1', family:'Shift', era:'current', period:'V1 Pro', character:'Spin · Pro', note:'The Shift 99 Pro is a distinct variation alongside the Shift 99 V1.', source:'https://www.wilson.com/en-gb/product/shift-99-pro-v1-wr14540', image:photo('WR145411U_/WR145411U__c6cbb040c5f63543a31c329bd3e20463.png'), frame:'#d5d0c1', accent:'#a4b4a4' },
  { id:'defyer-v1', name:'Defyer 100 V1', family:'Defyer', era:'current', period:'V1', character:'Spin & power', note:'Wilson presents Defyer as a spin and power family in its current range.', source:'https://www.wilson.com/en-gb/product/redline-100-v1-wr21540', image:photo('WR215411U_/WR215411U__ba9dbb4e9d2afde10a73f61b92617def.png'), frame:'#394e57', accent:'#d4b173' },
  { id:'defyer-v1-98-pro', name:'Defyer 98 Pro V1', family:'Defyer', era:'current', period:'V1 Pro', character:'98 Pro', note:'A 98 Pro alternative within Wilson’s Defyer V1 family.', source:'https://www.wilson.com/en-gb/product/redline-98-pro-v1-wr21530', image:photo('WR215311U_/WR215311U__46c9af8e33858e67603a5103ec233eb6.png'), frame:'#394e57', accent:'#d4b173' },
  { id:'rf01-pro', name:'RF 01 Pro', family:'RF', era:'current', period:'RF collection', character:'Modern precision', note:'Co-designed with Roger Federer after his playing career; it is not a frame he used on tour.', source:'https://www.wilson.com/en-gb/product/rf-01-pro-frm-wr15130', image:photo('WR151311U_/WR151311U__2cb4e2aa3b9b83f7dd1dae1589b8937b.png'), frame:'#3e4141', accent:'#bdbfb4' },
  { id:'rf01', name:'RF 01', family:'RF', era:'current', period:'RF collection', character:'Versatile feel', note:'The RF 01 is a separate model in the Federer-designed collection.', source:'https://www.wilson.com/en-gb/product/rf-01-frm-wr15140', image:photo('WR151411U_/WR151411U__fc1aaf1f09e8f5ade47cd1460a8cbf24.png'), frame:'#3e4141', accent:'#bdbfb4' },
  { id:'rf01-future', name:'RF 01 Future', family:'RF', era:'current', period:'RF collection', character:'Lighter RF', note:'Wilson lists the Future as a lighter variation of the RF 01.', source:'https://www.wilson.com/en-gb/product/rf-01-future-frm-wr16680', image:photo('WR166811U_/WR166811U__d0dadbf590f90185dfff6f6b8aea090b.png'), frame:'#3e4141', accent:'#bdbfb4' },
  { id:'t2000', name:'Wilson T2000', family:'T2000', era:'archive', period:'1967–84', character:'Connors’s steel frame', note:'Jimmy Connors popularised this chrome-plated steel frame. The International Tennis Hall of Fame holds his 1983 US Open T2000.', source:'https://racquets.tennisfame.com/metal-composite/jimmy-connors/t2000', image:'https://images.ctfassets.net/k9cxiz5etx5x/7uLCeQzpL9OQpRhaELJcGX/5d723b92cac55306fe4170480d645cc6/83-2_o3.jpg?w=750&h=530&fit=fill', frame:'#a4aaa5', accent:'#bb9f77' },
  { id:'pro-staff-85', name:'Pro Staff 85', family:'Pro Staff', era:'archive', period:'1983 onward', character:'A classic begins', note:'The compact 85 was in the first Pro Staff line. Pete Sampras and Roger Federer are among its best-known players.', source:history, image:historyPhoto('media_1e58ce5c485a91079124d1ea0dd66c5eabc06942c.png','png'), frame:'#303030', accent:'#c29865' },
  { id:'pro-staff-classic-61', name:'Pro Staff Classic 6.1', family:'Pro Staff', era:'archive', period:'1990s', character:'The Six.One story', note:'The early Classic led into the Six.One lineage; Wilson links Stefan Edberg to its history.', source:history, image:historyPhoto('media_11cdaf00739fc122461a6325bd6f05e92a0d5d410.jpg','jpg'), frame:'#76382f', accent:'#e0a766' },
  { id:'ncode-six-one-tour', name:'nCode nSix.One Tour 90', family:'Pro Staff', era:'archive', period:'2004–06', character:'Federer’s 90', note:'Wilson records seven of Federer’s singles majors during his nCode period. His tour setup was customised.', source:history, image:historyPhoto('media_140bc250aeee9d2bd1e2f820ff5abc23588b63dd4.jpg','jpg'), frame:'#3b3233', accent:'#b7584b' },
  { id:'rf97-autograph', name:'RF97 Autograph', family:'Pro Staff', era:'archive', period:'2014 onward', character:'Federer’s later era', note:'The RF97 Autograph was a defining Federer-era Pro Staff; tour specifications need not match retail frames.', source:'https://www.wilson.com/en-gb/blog/tennis/roger-federer-new-tennis-racket-journey-innovation-and-legacy', image:historyPhoto('media_10345cc35330793fa18aae83d7a3a58f6caf6a468.png','png'), frame:'#272827', accent:'#9f9e96' },
  { id:'blade-sw102', name:'Blade SW102 Autograph', family:'Blade', era:'archive', period:'Serena edition', character:'Serena’s signature', note:'Wilson and Serena Williams developed the SW102 Autograph; it sits in the Blade story.', source:'https://www.wilson.com/en-us/blog/tennis/team/designing-sw102-autograph-racket', image:'https://www.tennisnuts.com/images/product/full/WR059110U_blade-sw102-serena-williams-racket_A.jpg', frame:'#3d3b3a', accent:'#ba957b' },
]

export const racquetPlayers = [
  { name:'Jimmy Connors', chapter:'Wilson T2000', racquetId:'t2000', text:'His steel T2000 became an unmistakable part of his attacking baseline game; the Hall of Fame preserves one he used at the 1983 US Open.', story:['The T2000 looked unlike the wooden racquets around it. René Lacoste devised the steel-frame design, Wilson brought it to market, and Jimmy Connors made its compact, bright silhouette familiar to tennis crowds.','Connors kept playing with it as graphite frames spread through the tour. The International Tennis Hall of Fame preserves a T2000 he used at the 1983 US Open: a physical reminder that a player’s trusted feel can outlast a change in fashion.'], source:'https://racquets.tennisfame.com/metal-composite/jimmy-connors/t2000', sourceLabel:'International Tennis Hall of Fame' },
  { name:'Roger Federer', chapter:'Pro Staff 85 → Tour 90 → RF97', racquetId:'rf97-autograph', text:'His Wilson frames changed through his career. The later RF 01 collection was co-designed after retirement.', story:['Federer’s Wilson story runs through several shapes and generations: the Pro Staff 85, a series of 90-square-inch frames, and eventually the RF97 Autograph. Each chapter kept a recognisable emphasis on feel while his game and equipment evolved.','Wilson describes the later RF 01 collection as a project developed with Federer after his playing career. The models in this room show a lineage, not a claim that a shop racquet is identical to a professional’s customised match frame.'], source:'https://www.wilson.com/en-us/blog/tennis/rf-and-wilson-the-story-behind-the-partnership', sourceLabel:'Wilson' },
  { name:'Serena Williams', chapter:'Blade → SW102 Autograph', racquetId:'blade-sw102', text:'Wilson traces her Blade story back to a 2007 prototype and later worked with her on the SW102.', story:['Serena Williams’s Blade story was never just a colourway. Wilson traces her connection with the line to a 2007 prototype, then describes a later design process focused on how a larger head could still give her the control she wanted.','Wilson says its team tested nine 102-square-inch prototypes while developing the SW102 Autograph. The signature model marks a collaboration with a player whose power and precision shaped the brief; it should not be mistaken for a complete record of her customised tour setups.'], source:'https://www.wilson.com/en-us/blog/tennis/team/designing-sw102-autograph-racket', sourceLabel:'Wilson' },
  { name:'Pete Sampras', chapter:'Pro Staff 85', racquetId:'pro-staff-85', text:'The Pro Staff 85 is part of the lineage Wilson associates with Sampras.', story:['The compact Pro Staff 85 became closely associated with Pete Sampras’s serve-and-volley game. Its small head and direct response made it a demanding but distinctive frame, and an enduring part of the Pro Staff story.','The International Tennis Hall of Fame holds the Pro Staff he used in the 1998 Wimbledon final. That match racquet was modified with lead tape and strung with natural gut: a useful reminder that the champion’s personal setup differed from a standard retail frame.'], source:'https://racquets.tennisfame.com/graphite/pete-sampras/pro-staff', sourceLabel:'International Tennis Hall of Fame' },
] as const

export const wilsonStrings = [
  'Wilson NXT 16', 'Wilson NXT Control 16', 'Wilson Sensation 16',
  'Wilson Revolve 16', 'Wilson Revolve Spin 16',
  'Wilson Synthetic Gut Power 16', 'Wilson Natural Gut 16',
] as const
export const luxilonStrings = [
  'Luxilon ALU Power 125', 'Luxilon ALU Power Rough 125',
  'Luxilon 4G 125', 'Luxilon Element 130',
] as const
export const WILSON_STRINGS_SOURCE = 'https://www.wilson.com/en-gb/tennis/tennis-strings/wilson?collection_wil=5385'
export const LUXILON_STRINGS_SOURCE = 'https://www.wilson.com/en-gb/tennis/tennis-strings/luxilon?collection_wil=7973'
export const UTR_SOURCE = 'https://www.utrsports.net/pages/about-us'
export const GRIP_SIZE_SOURCE = 'https://www.wilson.com/en-gb/blog/tennis/how-choose-tennis-racket'

export type RacquetProfile = {
  name: string
  level: string // retained for existing saved cards; the editor now asks for UTR
  utr: string
  racquetId: string
  otherRacquet: string
  gripSize: string
  stringSource: '' | 'wilson' | 'luxilon' | 'other'
  strings: string
  tension: string
  note: string
}

export const emptyRacquetProfile: RacquetProfile = { name:'', level:'', utr:'', racquetId:'', otherRacquet:'', gripSize:'', stringSource:'', strings:'', tension:'', note:'' }
export const RACQUET_PROFILE_KEY = 'islington-tennis:racquet-profile'

export function parseRacquetProfile(raw: string | null): RacquetProfile {
  if (!raw) return { ...emptyRacquetProfile }
  try {
    const value: unknown = JSON.parse(raw)
    if (!value || typeof value !== 'object') return { ...emptyRacquetProfile }
    const record = value as Record<string, unknown>
    const field = (key: keyof RacquetProfile, limit: number) => typeof record[key] === 'string' ? (record[key] as string).slice(0, limit) : ''
    const racquetId = field('racquetId', 60)
    const strings = field('strings', 80)
    const source = field('stringSource', 8)
    const utr = field('utr', 5)
    const gripSize = field('gripSize', 1)
    const stringSource = source === 'other' ? 'other'
      : wilsonStrings.some(s => s === strings) ? 'wilson'
      : luxilonStrings.some(s => s === strings) ? 'luxilon'
      : strings ? 'other' : ''
    return {
      name:field('name', 50), level:field('level', 40),
      utr:utr && Number(utr) >= 1 && Number(utr) <= 16.5 ? utr : '',
      racquetId:racquets.some(r => r.id === racquetId) ? racquetId : '',
      otherRacquet:field('otherRacquet', 80),
      gripSize:/^[0-5]$/.test(gripSize) ? gripSize : '',
      stringSource,
      strings,
      tension:field('tension', 30), note:field('note', 160),
    }
  } catch { return { ...emptyRacquetProfile } }
}
