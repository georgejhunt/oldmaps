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
var boxcoords = [[[0,0],[0,1],[1,1],[1,0],[0,0]]];
var ptrcoords = [0,0];


var detail = new VectorTileLayer({
   source: new VectorTileSource({
      format: new MVT(),
      url: `./tileserver.php/detail/{z}/{x}/{y}.pbf`,
      minZoom: 0,
      attributions: ['&copy <a href="https://openstreetmap.org">OpenStreetMaps, </a> <a href="https://openmaptiles.com"> &copy OpenMapTiles</a>'
      ],
      maxZoom: 14
   }),
   declutter: true,
});

fetch(mapData + '/style-osm.json').then(function(response) {
   response.json().then(function(glStyle) {
     stylefunction(detail, glStyle,"openmaptiles");
   });
});


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

function get_box_coords(radius,lon,lat){
   // go to polar coords -- Math functions want and provide in radians
   var deltaY = Math.asin(radius / 6378000.0);
   //console.log('deltaYradians'+deltaY);
   var lat_rad = lat * Math.PI /180;
   var deltaX = deltaY / Math.cos(lat_rad);
   var lon_rad = lon * Math.PI / 180;
   var west = (lon_rad - deltaX) * 180 / Math.PI;
   var south = (lat_rad - deltaY) * 180 / Math.PI;
   var east = (lon_rad + deltaX) * 180 / Math.PI
   var north = (lat_rad + deltaY) * 180 / Math.PI
   console.log('west:'+west+'south:'+south+'east:'+east+'north;'+north)
   var sw = [west,south];
   var se = [east,south];
   var ne = [east,north];
   var nw = [west,north];
   sw = fromLonLat(sw);
   se = fromLonLat(se);
   ne = fromLonLat(ne);
   nw = fromLonLat(nw);
   console.log('box x:' + sw[0]-se[0] + 'box y:' + ne[1]-se[1]);
   boxcoords = [nw,sw,se,ne,nw];   
   console.log(boxcoords + 'boxcoords');
   return(boxcoords);
}
var box_spec = get_box_coords(radius,-122.24,37.45);

var satLayer = new VectorLayer({
   style: new Style({
      stroke: new Stroke({
        color: 'rgb(255, 140, 0, 1)'
      })
   }), 
   source: new VectorSource({
      features: [new Feature({
         geometry: new Polygon([box_spec])
      })]      
   })
});


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


var map = new Map({ target: 'map-container',
  layers: [detail,boxLayer,satLayer],
  //layers: [satLayer],
  view: new View({
    center: fromLonLat([-122.24,37.45]),
    zoom: 2
  })
}); //end of new Map
window.map = map
var view = map.getView();

map.on("pointermove", function(evt) {
   ptrcoords = toLonLat(evt.coordinate);
   lat = ptrcoords[1];
   lon = ptrcoords[0];
   //satLayer.getSource().clear();
   //update_satbox(evt);
});
$( document ).on('change','#area-choice',function(elem){
   if ( elem.target.value == 'small' )
      radius = 50000; else radius = 150000;
})

