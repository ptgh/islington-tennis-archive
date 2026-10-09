import {venues} from './venues';
import {hubServices} from './hub';
import {playOpportunities} from './play';
import {places} from './places';
import {busRoutes} from './busRoutes';
import {mapStations,tubeConnections} from './transit';
/** Content boundary for future boroughs. The illustrated scene remains Islington-specific. */
export const borough = {
  id:'islington',name:'Islington',timeZone:'Europe/London',
  venues,services:hubServices,play:playOpportunities,places,busRoutes,
  stations:mapStations,tubeConnections,
  tour:[
    {name:'Highbury Fields',lat:venues[0].lat,lng:venues[0].lng,description:'Start among the park courts — explore a venue pin to book or find coaching.'},
    {name:'Islington Tennis Centre',lat:venues[1].lat,lng:venues[1].lng,description:'Indoor and outdoor tennis, private coaches and social doubles.'},
    {name:'Rosemary Gardens',lat:venues[2].lat,lng:venues[2].lng,description:'Neighbourhood tennis and community programmes beside the canal.'},
    {name:'Tufnell Park tennis',lat:venues[3].lat,lng:venues[3].lng,description:'Two outdoor courts. Select the tennis pin to explore access and booking.'},
  ],
};
