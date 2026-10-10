export interface ForecastHour {time:number;temperature:number;rain:number;wind:number;code:number}
export const WEATHER_URL='https://api.open-meteo.com/v1/forecast?latitude=51.54&longitude=-0.105&hourly=temperature_2m,precipitation_probability,weather_code,wind_speed_10m&forecast_days=3&timeformat=unixtime&wind_speed_unit=mph&timezone=Europe%2FLondon';
export function parseForecast(value:unknown,now=Date.now()):ForecastHour[]{
  const h=(value as {hourly?:Record<string,unknown[]>})?.hourly;
  if(!h||!Array.isArray(h.time))throw new Error('Forecast unavailable');
  const rows=h.time.map((time,i)=>({time:Number(time)*1000,temperature:h.temperature_2m?.[i],rain:h.precipitation_probability?.[i],wind:h.wind_speed_10m?.[i],code:h.weather_code?.[i]}))
    .filter(row=>Object.values(row).every(v=>typeof v==='number'&&Number.isFinite(v))&&row.time>=now-3600000) as ForecastHour[];
  if(!rows.length)throw new Error('Forecast unavailable');
  return rows.slice(0,48);
}
export function weatherKind(code:number){return code>=51&&code<=67||code>=80&&code<=82||code>=95?'rain':code>=71&&code<=77||code===85||code===86?'snow':code>=2?'cloud':'clear';}
export function weatherLabel(code:number){return code>=95?'Thunderstorms':code>=51&&code<=57?'Drizzle':weatherKind(code)==='rain'?'Rain / showers':weatherKind(code)==='snow'?'Snow':code===45||code===48?'Fog':code===3?'Overcast':code===2?'Partly cloudy':'Clear / mostly clear';}
