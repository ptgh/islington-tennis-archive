import { useId } from 'react';

/** Original vector miniatures: recognisable silhouettes, deliberately not site plans. */
export function AtlasMiniature({place}:{place:'wimbledon'|'queens'|'islington'}) {
  const id=useId().replace(/:/g,'');
  const grass=`${id}-grass`, roof=`${id}-roof`, shadow=`${id}-shadow`;
  return <svg viewBox="0 0 240 160" aria-hidden="true" className="atlas-miniature">
    <defs>
      <linearGradient id={grass} x2=".6" y2="1"><stop stopColor="#bdce97"/><stop offset="1" stopColor="#77945b"/></linearGradient>
      <linearGradient id={roof} x2="0" y2="1"><stop stopColor="#fffdf0"/><stop offset="1" stopColor="#bbbda9"/></linearGradient>
      <filter id={shadow} x="-30%" y="-50%" width="160%" height="220%"><feDropShadow dx="0" dy="7" stdDeviation="5" floodColor="#314932" floodOpacity=".22"/></filter>
    </defs>
    <g filter={`url(#${shadow})`}>
      <path d="M18 113 107 65 226 110 138 156Z" fill="#c5bb9a"/>
      <path d="M18 109 107 61 226 106 138 152Z" fill={`url(#${grass})`}/>
      {place==='wimbledon'?<>
        <path d="M41 74Q40 35 119 26Q199 28 202 71L202 96Q186 128 120 131Q48 123 41 96Z" fill="#889181"/>
        <path d="M42 78Q79 112 130 110Q180 109 201 78V97Q177 127 121 131Q59 122 42 96Z" fill="#b8bdab"/>
        {Array.from({length:15},(_,i)=><path key={i} d={`M${51+i*10} 89v20`} stroke="#667d62" strokeWidth="3"/>)}
        <ellipse cx="121" cy="70" rx="81" ry="43" fill={`url(#${roof})`}/>
        <ellipse cx="121" cy="70" rx="60" ry="29" fill="#354f49"/>
        <ellipse cx="121" cy="73" rx="48" ry="22" fill="#617d51"/>
        <g transform="translate(84 58) skewY(-7)"><rect width="74" height="32" fill="#8ba96d"/>
          <path d="M3 2h68v28H3ZM14 2v28M60 2v28M37 2v28M14 16h46" fill="none" stroke="#f9f9df" strokeWidth=".8"/>
          <path d="M37 0v33" stroke="#30483d" strokeWidth="1.4"/></g>
        <path d="M48 62Q72 38 101 37L99 48Q71 51 61 68Z M143 37Q178 41 192 61L178 67Q165 51 143 48Z" fill="#faf8e8"/>
        <path d="M79 28V11" stroke="#606d54" strokeWidth="1.5"/><path d="M80 11h17l-4 6H80Z" fill="#726786"/>
      </>:place==='queens'?<>
        <path d="M43 52 156 38 206 60 95 76Z" fill="#59644f"/>
        <path d="M43 53 95 77V111L43 86Z" fill="#956147"/>
        <path d="M95 77 206 61V98L95 112Z" fill="#bc8161"/>
        <path d="M91 76 151 68 151 31 129 17 110 36V73Z" fill="#c38a68"/>
        <path d="m105 35 24-24 27 18-5 4-22-16-20 23Z" fill="#5c6555"/>
        <circle cx="130" cy="39" r="7" fill="#f8edd2" stroke="#9c7051"/>
        <path d="M130 34v5l4 2" fill="none" stroke="#425e48"/>
        {Array.from({length:8},(_,i)=><g key={i} transform={`translate(${100+i*13} ${80-i*1.8})`}><path d="M0 0h6v10H0Z" fill="#e6d4af"/><path d="M1 1h4v8H1Z" fill="#3a5b50"/></g>)}
        <path d="M43 69 95 93 206 78M95 105 206 90" fill="none" stroke="#e3c49b" strokeWidth="2"/>
        <g transform="translate(72 104) skewX(58) scale(.64 .48)"><rect width="86" height="61" fill="#456b53" stroke="#dbe2b9" strokeWidth="5"/><path d="M4 3h78v55H4ZM17 3v55M68 3v55M17 16h51M17 45h51M42 16v29M0 30h86" fill="none" stroke="#e8edce" strokeWidth="1.2"/></g>
      </>:<>
        <g transform="matrix(.8 .31 -.63 .36 99 67)">
          <rect width="127" height="92" fill="#345e4f" stroke="#dedec9" strokeWidth="6"/>
          {[0,1,2].map(i=><g key={i} transform={`translate(${5+i*41} 6)`}><rect width="35" height="80" fill="#749da0"/><path d="M2 2h31v76H2ZM8 2v76M27 2v76M8 21h19M8 57h19M17 21v36M0 39h35" fill="none" stroke="#fffce7" strokeWidth="1.2"/></g>)}
        </g>
        <path d="m156 42 34-12 22 15-34 13Z" fill="#696c54"/><path d="M178 58v30l34-12V45Z" fill="#bb9169"/><path d="M156 42v29l22 17V58Z" fill="#987657"/>
      </>}
      {[{x:27,y:91},{x:33,y:114},{x:202,y:114},{x:218,y:100}].map((p,i)=><g key={i}><path d={`M${p.x} ${p.y}v12`} stroke="#746443" strokeWidth="3"/><circle cx={p.x} cy={p.y} r="9" fill={i%2?'#6d8b50':'#8fa568'}/><circle cx={p.x-3} cy={p.y-4} r="5" fill="#a8bc7d"/></g>)}
    </g>
  </svg>;
}
