
var map = L.map('map', {
  center:[42.684, 23.327], 
  zoom:13, 
  minZoom: 11, 
  maxZoom: 19, 
  maxBounds: [[43.4,26.2],[41.5,22.0]],

  maxBoundsViscosity: 1.0,
  bounceAtZoomLimits:false,
  touchZoom:true,
  scrollWheelZoom:!isIFrame(),
  zoomSnap:0.3
});

map.createPane('nogo-overlay');
map.createPane('perm-overlay');

L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png', {              
  attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
  subdomains: 'abcd',
  maxZoom: 19
}).addTo(map);

var layers = null, gjlayers = null, permlayers = null;
/*
var radius = 0; 
map.on("click", ()=>{ 
  radius=(radius+50)%300; 
  layers.eachLayer(l=>l.setRadius(radius+50));
});
*/

d3.tsv("bans-dots.tsv").then(f => {
  var layersData=[]
  f.forEach(f=> {
    var c=L.circle([f.lat,f.lng], 
      {
        radius:100, 
        stroke:false, 
        fillColor:"red", 
        fillOpacity:1,
        pane:'nogo-overlay'
      }
    );
    c.data=f;
    layersData.push(c);
  });
  layers=L.layerGroup(layersData);
  map.addLayer(layers);
});

fg=null;
d3.tsv("permits.tsv").then(f => {
  fg=d3.group(f,s=>s.lat+","+s.lng);
  var layersData=[...fg.values()].map(v=> {
    var m = L.marker([v[0].lat,v[0].lng],{pane:'perm-overlay'});
    m.data=v;
    m.bindPopup(permitContents);
    return m;
  });
  permlayers=L.layerGroup(layersData);
  map.addLayer(permlayers);
});

d3.json("bans-areas.geojson").then(f => {
  gjlayers = L.geoJSON(f, {
    stroke:false, 
    fillColor:"red", 
    fillOpacity:1,
    pane:'nogo-overlay'
  });
  map.addLayer(gjlayers);
});

map.on("click",a=>{
  var issues = getIssues(a.latlng);
  if (issues.length) {
    var content = "<h3>Забранено за пиротехника, защото:</h3><ul>"+issues.map(i=>"<li>"+i+"</li>").join("")+"</ul>";
    L.popup(a.latlng,{"content":content}).openOn(map);
  } else {
    map.closePopup();
  }
});

function permitContents(l) {
  console.log(l);
  var v = l.data;
  var issues = getIssues([v[0].lat,v[0].lng]);

  var d = "<h3>"+(v.length>1?v.length+" разрешения":"Едно разрешение")+" от "+v[0].region+"</h3>";
  d+=v[0].details?"<p><b>Проблеми:</b> "+v[0].details+"</p>":"";
  if (issues.length) {
    d+= "<p><b>Други проблеми:</b></p><ul>"+issues.map(i=>"<li>"+i+"</li>").join("")+"</ul>";
  }
  d+="<p><b>Събития:</b></p>"
  d+="<ul>"+v.map(e=>"<li>На "+e.event+" между "+e.timeframe.replace("-"," и ")+" разрешено на "+e.permit+"</li>").join("")+"</ul>";

  return d;
}

function getIssues(latlng) {
  var issues = leafletPip.pointInLayer(latlng,gjlayers)
  .map(f=>f.feature.properties.type!="междублоково"?"в района на "+f.feature.properties.type:"на територията на междублоково пространство");
  issues.push(...layers.getLayers()
    .map(l=>{ 
      return {
        distance: Math.round(l.getLatLng().distanceTo(latlng)),
        radius: l.getRadius(),
        type: l.data.type
      };
    })
    .filter(l=>l.distance<=l.radius)
    .map(l=>"на "+l.distance+" м. от "+l.type));
  return issues;
}

function isIFrame() {
  try {
    return window.self !== window.top || window.frameElement!=null;
  } catch (e) {
    return true;
  }
}

