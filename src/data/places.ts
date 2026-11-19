/** Landmark anchors use the stored OSM building footprints; park points remain orientation aids. */
export const places = [
  {id:'highbury-park',name:'Highbury Fields',lat:51.5521,lng:-.0948,kind:'park'},
  {id:'rosemary-park',name:'Rosemary Gardens',lat:51.5381,lng:-.0867,kind:'park'},
  {id:'tufnell-fields',name:'Tufnell Park Playing Fields',lat:51.5589,lng:-.135,kind:'park'},
  {id:'spa-park',name:'Spa Fields',lat:51.5257,lng:-.109,kind:'park'},
  {id:'caledonian-park',name:'Caledonian Park',lat:51.5481,lng:-.1223,kind:'park'},
  {id:'clissold-park',name:'Clissold Park',lat:51.5618,lng:-.0890,kind:'park'},
  // Centres of OSM ways 27815160, 37371124 and 230253685 in the borough snapshot.
  {id:'union-chapel',name:'Union Chapel',lat:51.5447602,lng:-.1024571,kind:'landmark'},
  {id:'clock-tower',name:'Caledonian Clock Tower',lat:51.5471382,lng:-.1236244,kind:'landmark'},
  {id:'estorick',name:'Estorick Collection',lat:51.5438936,lng:-.1004414,kind:'landmark'},
  // Source footprint centres; destinations reuse the continuous geographic world.
  {id:'st-pancras-station',zoom:14,name:'St Pancras International',lat:51.5320147,lng:-0.1265685,kind:'destination',sourceWay:'4256246',sourceUrl:'https://stpancras.com/'},
  {id:'bt-tower',zoom:10,name:'BT Tower',lat:51.5214431,lng:-0.1388019,kind:'destination',sourceWay:'5022282',sourceUrl:'https://historicengland.org.uk/listing/the-list/list-entry/1350342'},
  {id:'kings-cross-station',zoom:17,name:'King’s Cross station',lat:51.5318608,lng:-0.1240501,kind:'destination',sourceWay:'-72165470',sourceUrl:'https://www.networkrail.co.uk/communities/passengers/our-stations/london-kings-cross/'},
  {id:'standard-hotel',name:'The Standard · red lift',lat:51.5294340,lng:-0.1245167,kind:'destination',sourceWay:'107005576',sourceUrl:'https://www.standardhotels.com/en-GB/london/properties/london'},
  {id:'newton-sculpture',name:'Newton After Blake',lat:51.5290366,lng:-.1275758,zoom:55,kind:'destination',sourceNode:'2617831369',sourceUrl:'https://pictures.royalsociety.org/image-rs-13607'},
  {id:'paradigm-sculpture',name:'Paradigm · the Crick',lat:51.5319083,lng:-.1277695,zoom:40,kind:'destination',sourceNode:'5223921503',sourceUrl:'https://artwisecurators.com/exhibitions/9-the-crick-paradigm-wellcome-foundation-2014-2016/overview/'},
  {id:'british-library',zoom:22,name:'British Library',lat:51.5302507,lng:-.1276186,kind:'destination',sourceWay:'4680891',sourceUrl:'https://www.bl.uk/visit'},
  {id:'kings-place',name:'Kings Place',lat:51.5350329,lng:-.1216162,kind:'destination',sourceWay:'27511817',sourceUrl:'https://www.kingsplace.co.uk/your-visit/'},
  {id:'sadlers-wells',name:'Sadler’s Wells',lat:51.5296180,lng:-.1061029,kind:'destination',sourceWay:'98992534',sourceUrl:'https://www.sadlerswells.com/your-visit/sadlers-wells-theatre/'},
  {id:'canal-museum',name:'London Canal Museum',lat:51.5342186,lng:-.1202069,kind:'destination',sourceWay:'190831613',sourceUrl:'https://canalmuseum.org.uk/visit/index.html'},
  {id:'town-hall',name:'Islington Town Hall',lat:51.5416435,lng:-.1023009,kind:'destination',sourceWay:'27822406',sourceUrl:'https://www.islington.gov.uk/contact-us/our-offices/islington-town-hall'},
  {id:'barbican-centre',name:'Barbican Centre',lat:51.5200,lng:-.0938,kind:'landmark'},
];
