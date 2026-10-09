/** Orientation connections, not live service information or tunnel alignments. */
export const mapStations = [
  // TfL StopPoint coordinates checked 25 September 2026.
  {name:'Highgate',lat:51.577532,lng:-.145857,lines:'Northern'},
  {name:'Barbican',lat:51.520275,lng:-.097993,lines:'Circle · Hammersmith & City · Metropolitan'},
  {name:'Bond Street',lat:51.513362,lng:-.148795,lines:'Central · Jubilee · Elizabeth'},
  {name:'Manor House',lat:51.570738,lng:-.096118,lines:'Piccadilly'},
  {name:'Essex Road',lat:51.540705,lng:-.096276,lines:'National Rail'},

  {name:'Angel',lat:51.532624,lng:-.105898,lines:'Northern'},
  {name:'Highbury & Islington',lat:51.546269,lng:-.103538,lines:'Victoria · Overground · National Rail'},
  {name:'Caledonian Road',lat:51.548519,lng:-.118493,lines:'Piccadilly'},
  {name:'Finsbury Park',lat:51.564778,lng:-.105876,lines:'Victoria · Piccadilly · National Rail'},
  {name:'Archway',lat:51.565478,lng:-.134819,lines:'Northern'},
  {name:'King’s Cross St Pancras',lat:51.5308,lng:-.1238,lines:'Northern · Victoria · Piccadilly · Circle · Hammersmith & City · Metropolitan'},
  {name:'Old Street',lat:51.5256,lng:-.0875,lines:'Northern · National Rail'},
  {name:'Euston',lat:51.5282,lng:-.1337,lines:'Northern · Victoria · National Rail'},
];
export const tubeConnections = [
  {name:'Northern · Bank branch',color:'#555957',stops:['Euston','King’s Cross St Pancras','Angel','Old Street']},
  {name:'Victoria',color:'#599fb9',stops:['Euston','King’s Cross St Pancras','Highbury & Islington','Finsbury Park']},
];
