// main.js for Admin Console using vector tiles for more detail
import {Fill, Stroke, Style} from 'ol/style';
import 'ol/ol.css';
import Map from 'ol/Map';
import VectorLayer from 'ol/layer/Vector';
import VectorTileLayer from 'ol/layer/VectorTile';
import VectorTileSource from 'ol/source/VectorTile';
import MVT from 'ol/format/MVT';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import View from 'ol/View';
import {fromLonLat,toLonLat} from 'ol/proj';
import stylefunction from 'ol-mapbox-style/stylefunction';
import {add} from 'ol/coordinate';
import Feature from 'ol/Feature';
import Polygon from 'ol/geom/Polygon';


// a global variable to control which features are shown
window.$ = window.jQuery = require('jquery');
var show = {};
var mapData = "/admin/map";
var zoom = 3;
var lat = 37;
var lon = -122;
var radius = 150000;

var map = new Map({ target: 'map-container',
  view: new View({
    center: fromLonLat([-71.06, 42.37]),
    zoom: 2
  })
}); //end of new Map
window.map = map
var view = map.getView();


var detail = new VectorTileLayer({
   source: new VectorTileSource({
      format: new MVT(),
      url: `./tileserver.php/detail/{z}/{x}/{y}.pbf`,
      minZoom: 0,
      attributions: ['&copy <a href="https://openstreetmap.org">OpenStreetMaps, </a> <a href="https://openmaptiles.com"> &copy OpenMapTiles</a>'
      ],
      maxZoom: 14
   }),
   //declutter: true,
});

fetch(mapData + '/style-osm.json').then(function(response) {
   response.json().then(function(glStyle) {
     stylefunction(detail, glStyle,"openmaptiles");
   });
});

map.addLayer(detail);

var setBoxStyle = function(feature) {
  var name = feature.get("name");
  //alert(keys+'');
  if (typeof show !== 'undefined' &&
       show != null && name == show) {
    return new Style({
      fill: new Fill({
        color: 'rgba(67, 163, 46, 0.2)'
      }),
      stroke: new Stroke({
        color: 'rgba(67, 163, 46, 1)',
        width: 2
      })
    })
  } else {
    return new Style({
      fill: new Fill({
        color: 'rgba(255,255,255,.10)'
      }),
      stroke: new Stroke({
        color: 'rgba(255,255,255,.3)'
      })
    })
  }
}

var boxLayer = new VectorLayer({
  source: new VectorSource({
    format: new GeoJSON(),
    url: mapData + '/bboxes.geojson'
  }),
  id: 'boxes',
  style: setBoxStyle
});
map.addLayer(boxLayer);

var satLayer = new VectorLayer({
        source: new VectorSource({
            features: [new Feature({
                geometry: new Polygon(markers, 'XY'),

            })]
        })
        //style: iconStyle
});

map.addLayer(satLayer);

$( document ).on("mouseover",".extract",function(){

  var data = JSON.parse($(this).attr('data-region'));
  show = data.name;
  //setBoxStyle();
  boxLayer.changed();
});
$( document ).on("mouseout",".extract",function(){
  var data = JSON.parse($(this).attr('data-region'));
  show = '';
  boxLayer.changed();
});
function update_satbox(evt){
   //console.log(evt.coordinate)
   // need to change the following to correct projection
   var nwcoord = add(evt.coordinate,[-radius,-radius])
   var secoord = add(evt.coordinate,[radius,radius])
   satLayer.removeAllFeatures();
   west = nwcoord[0];
   south = secoord[0];
   east = secoord[1];
   north = nwcoord[1];
   boxcoords = [(west,north),(west,south),(east,south),(east,north),(west,north);   
   //console.log(nwcoord);
   //console.log(secoord);
   
}
map.on("pointermove", function(evt) {
   var coords = toLonLat(evt.coordinate);
   lat = coords[1];
   lon = coords[0];
   update_satbox(evt);
});
$( document ).on('change','#area-choice',function(elem){
   if ( elem.target.value == 'small' )
      radius = 50000; else radius = 150000;
})
