// right stage1 branch -- working towards a minumum testable addition to master
//////////////////s1 Imports ///////////////////////////////////////////////////
var ContextMenu = require('./assets/ol-contextmenu.js');
//var ol = require('ol');
// temp.js for base -- regional OSM vector tiles
import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import XYZSource from 'ol/source/XYZ';
import {fromLonLat,toLonLat,transform} from 'ol/proj';
import TileLayer from 'ol/layer/Tile';
import TileImage from 'ol/source/TileImage';
import VectorTileLayer from 'ol/layer/VectorTile';
import VectorTileSource from 'ol/source/VectorTile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import MVT from 'ol/format/MVT';
import stylefunction from 'ol-mapbox-style/dist/stylefunction';
//import olms from 'ol-mapbox-style';
//var stylefunction = olms.stylefunction
import {defaults as defaultControls, ScaleLine,Attribution} from 'ol/control.js';
import {GPX, GeoJSON, IGC, KML, TopoJSON} from 'ol/format';
import {Style, Fill, Stroke, Circle, Icon, Text} from 'ol/style';
import Point from 'ol/geom/Point';
import Feature from 'ol/Feature';
import {format} from 'ol/coordinate';
//import WMTSCapabilities from 'ol/format/WMTSCapabilities.js';
//import WMTS,{optionsFromCapabilities} from 'ol/source/WMTS.js';
//import WMTSTileGrid from 'ol/tilegrid/WMTS.js';
import {get as getProjection} from 'ol/proj.js';
import {getWidth, getTopLeft} from 'ol/extent.js';
import LayerSwitcher from './assets/ol5-layerswitcher.js';
import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.css';
import MapBrowserEvent from 'ol/MapBrowserEvent'
import DragAndDrop from 'ol/interaction/DragAndDrop';
//import sync from 'ol-hashed';

//////////////////s2  GLOBALS /////////////////////////////
window.$ = window.jQuery = require('jquery');
const typeahead = require('./assets/bootstrap-typeahead.min.js');
var scaleLineControl = new ScaleLine();
var attribution = new Attribution({
   label: "OpenStreetMaps.org, OpenLayers.com"});

// keep the values set in init.json for home button to use
var config = {};

// Globals for satellite images
var projection = getProjection('EPSG:3857');
var projectionExtent = projection.getExtent();
var size = getWidth(projectionExtent) / 256;
var osm_style = '../assets/style-sat.json';

// initial values for on event variables to get through startup
var zoom = 3;
var lat = 37;
var lon = -122;
var show = 'min';
var map;
var osm_style = '../assets/style-sat.json';
var tiledata = {};

//////////////////s3 Functions /////////////////////////////////////////////////
function basename(path) {
     return path.replace(/.*\//, '');
}

function dirname(path) {
     return path.match(/.*\//);
}

//////////////////s4 MAPS ///////////////////////////////////////////////////
var map = new Map({ 
  target: 'map-container',
  controls: defaultControls({attribution: false}).extend([
    scaleLineControl,attribution
  ]),
  view: new View({
    center: fromLonLat([-122, 37.35]),
    maxZoom: 19,
    zoom: 11
  })
  //overlays: [overlay]
}); //end of new Map

//sync(map);

// Get list of all files in the tiles directory
  var resp = $.ajax({
    type: 'GET',
    url: '../mbtileinfo.php',
    async: false,
    dataType: 'text'
  })
  .done(function( data ) {
    var tilenames = JSON.parse(data);
    for(var i = 0;i < tilenames.length;i++){
      console.log('filename:  ' + tilenames[i]['basename']);
      tiledata[basename(tilenames[i]['basename'])] = tilenames[i];
    }
  })

// The Satellite layer needs to go down first with OSM data on top
for(var mbt in tiledata){
   if (mbt.substr(0,3) == 'sat'){
      var sat_layer =  new TileLayer({
        opacity: 1,
        title: 'Satellite',
          //minResolution: 25,
          source: new XYZSource({
           cacheSize: 0,
           // -y in the followinng url changes origin form lower left to upper left
           url: '../tileserver.php?../tiles/' + mbt + '/{z}/{x}/{-y}.jpeg',
           wrapX: true
        })
      });
   }
}

var layerDict = {};   
for(var mbt in tiledata){
   if (mbt.substr(0,3) != 'sat'){
      var url = '../tileserver.php?../tiles/' +  mbt + '/{z}/{x}/{y}.pbf';
      console.log('URL:' + url);
      const maxzoom = tiledata[mbt]['maxzoom'];
      if (maxzoom <11) {
         layerDict[mbt] = (new VectorTileLayer({
            source: new VectorTileSource({
               cacheSize: 0,
               format: new MVT(),
               url: url
            }),
            //title: 'OSM',
            maxZoom:10, 
            declutter: true
         }));
      } else {
         layerDict[mbt] = (new VectorTileLayer({
            source: new VectorTileSource({
               cacheSize: 0,
               format: new MVT(),
               url: url,
               maxZoom: 14,
            }),
            title: 'OSM',
            declutter: true
         }));
      }
   }
}

function set_detail_style(the_style){
   console.log('fetch: '+the_style);
   fetch(the_style).then(function(response) {
      response.json().then(function(glStyle) {
         for(var mbt in layerDict){
           console.log('mbtiles name: ' + mbt);
           if (mbt.substr(0,3) == 'sat') continue;
           stylefunction(layerDict[mbt], glStyle,"openmaptiles");
         };
      });
   });
}
set_detail_style(osm_style);

///////  Drop new layer onto map  //////////////
const dropSource = new VectorSource();
const drop = new VectorLayer({
  source: dropSource
});

map.addInteraction(new DragAndDrop({
  source: dropSource,
  formatConstructors: [GPX, GeoJSON, IGC, KML, TopoJSON]
}));

/////   add Layers    /////////////////
map.addLayer(sat_layer);
for(var mbt in tiledata){
   if (mbt.substr(0,3) != 'sat'){
         map.addLayer(layerDict[mbt]);
   }
}

const boxLayer =  new VectorLayer({
   source: new VectorSource({
     format: new GeoJSON(),
     url: '../assets/bboxes.geojson'
   }),
   style: function(feature) {
     var name = feature.get("name");
     var found = false;
      if (name.startsWith('sat')) {
       return new Style({
         fill: new Fill({
           color: 'rgba(67, 163, 46, 0)'
         }),
         stroke: new Stroke({
           color: 'rgba(250, 200, 20, 1)',
           width: 2
         })
      })
     }
     for(var mbt in tiledata){
       if (mbt.startsWith(name) &&
       ! name.startsWith('sat')) found = true;
     }
     if (found){
          return new Style({
            fill: new Fill({
              color: 'rgba(67, 163, 46, 0)'
            }),
            stroke: new Stroke({
              color: 'rgba(67, 163, 46, 1)',
              width: 2
            })
         })
       } else {
          return new Style({
            fill: new Fill({
              color: 'rgba(255,255,255,0)'
            }),
            stroke: new Stroke({
              color: 'rgba(255,255,255,0)'
            })
          })
       }
      
     } 
   
})
map.addLayer(boxLayer);    
map.addLayer(drop);

////////s5   MAP EVENTS  ////////////
map.on("moveend", function() {
   var newZoom = map.getView().getZoom();
  if (zoom != newZoom) {
    update_overlay();
    console.log('zoom end, new zoom: ' + newZoom);
    zoom = newZoom;
  }
});

map.on("pointermove", function(evt) {
   var coords = toLonLat(evt.coordinate);
   lat = coords[1];
   lon = coords[0];
   update_overlay();
});

sat_layer.on('change:visible', function(evt) {
   console.log("evt.oldValue:" + evt.oldValue);
   if ( evt.oldValue == false )
      osm_style = '../assets/style-sat.json'
   else
      osm_style = '../assets/style-osm.json';
   set_detail_style(osm_style);
});

//////////s6    BOTTOM LINE OVERLAY FUNCTIONS  ///////////
// Configuration of home key in init.json
var resp = $.ajax({
   type: 'GET',
   async: true,
   url: '../init.json',
   dataType: 'json'
})
.done(function( data ) {
   config = data;
   var coord = [parseFloat(config.center_lon),parseFloat(config.center_lat)];
   console.log(coord + "");
   var there = fromLonLat(coord);
   map.getView().setCenter(there);
   map.getView().setZoom(parseFloat(config["zoom"]));
   show = config.region;
   $( '#home' ).on('click', function(){
      console.log('init.json contents:' + config.center_lat);
          var there = fromLonLat([parseFloat(config.center_lon),parseFloat(config.center_lat)]);
          map.getView().setCenter(there);
          map.getView().setZoom(parseFloat(config.zoom));
          console.log('going there:' +there + 'zoom: ' + parseFloat(config.zoom));
   });
});

// Functions to compute tiles from lat/lon for bottom line
function long2tile(lon,zoom) {
   return (Math.floor((lon+180)/360*Math.pow(2,zoom)));
}

function lat2tile(lat,zoom)  {
   return (Math.floor((1-Math.log(Math.tan(lat*Math.PI/180) + 1/Math.cos(lat*Math.PI/180))/Math.PI)/2 *Math.pow(2,zoom)));
}

function update_overlay(){
    var locTxt = "Lat: " + lat.toFixed(2) + " Lon: " + lon.toFixed(2); 
    var tilex = long2tile(lon,zoom);
    var tiley = lat2tile(lat,zoom);
    var zoomInfo = ' Zoom: ' + zoom.toFixed(1);
    //locTxt += "   TileX: " + tilex + " TileY: " + tiley + zoomInfo; 
    locTxt += zoomInfo; 
    info_overlay.innerHTML = locTxt;
}

var layerSwitcher = new LayerSwitcher({
  tipLabel: 'Légende', // Optional label for button
  layers:map.getLayers()
});
map.addControl(layerSwitcher);

var info_overlay = 1;
$( document ).ready(function() {
   // typeahead has (window.jQuery) at the end of its definition
   window.$ = window.jQuery = jQuery;  // needs definition globally
   var unitsSelect = document.getElementById('units');
   function onChange() {
     scaleLineControl.setUnits(unitsSelect.value);
   }
   info_overlay = document.getElementById('info-overlay');
   unitsSelect.addEventListener('change', onChange);
   onChange();
});

   var selections = Array(50);
   function go_there(item){
       for (var i=0;i<selections.length;i++){
          if (selections[i].geonameid == item.value){
             var there = fromLonLat([selections[i].lon,selections[i].lat]);
             map.getView().setCenter(there);
             map.getView().setZoom(10);
             console.log(selections[i].lon + ' ' + selections[i].lat);
          }
       }
       $('#search').val('');
    }

$(function() {
  $('#search').typeahead({
      onSelect: function(item) {
        console.log(item);
        go_there(item);
      },
      ajax: {
         url: './searchapi.php?searchfor='+$('#search').val(),
         method: 'get',
         triggerLength: 1,
         displayField: 'name',
         valueField: "geonameid",
         dataType: "json",
         preProcess: function (data) {
          if (data.success === false) {
            // Hide the list, there was some error
            return false;
          }
          // We good!
          selections = [];
          for (var i=0;i<data.length;i++) {
            data[i].name = data[i].name + ' ' + data[i].country_code + ' pop: ' + data[i].population;
            var choice = {geonameid:data[i].geonameid,lon:data[i].longitude,lat:data[i].latitude};
            selections.push(choice);
          } 
          return data;
          }
      }, // ajax get cities with his prefix
   }); // typeahead onSelect
}); // end of search selection


