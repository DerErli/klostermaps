const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

const Map = require('../models/Map');

const cachedGraph = path.resolve('./userUploads', 'cachedGraphTmp.json');
const threshold = 20;
const lineThreshold = 0.05;

async function cacheGraph() {
  try {
    let maps = await Map.find().select('markers polylines name');

    let createGraph = require('ngraph.graph');
    let graph = createGraph();

    for (map of maps) {
      extendGraph(map, graph);
    }

    var toJSON = require('ngraph.tojson');
    var data = toJSON(graph);

    var update = true;
    if (fs.existsSync(cachedGraph)) {
      var old = await fs.readJSON(cachedGraph);
      if (
        crypto
          .createHash('sha256')
          .update(data)
          .digest('base64') ==
        crypto
          .createHash('sha256')
          .update(old)
          .digest('base64')
      )
        update = false;
    }

    if (update) {
      await fs.writeJson(cachedGraph, data);
      console.log(`Graph cached : ${graph.getLinksCount()} Links`);
    }
  } catch (err) {
    console.log('Graph caching failed!');
    console.error(err);
  }
}

function extendGraph(map, graph, stairways) {
  let connections = [];
  let points = [];

  //fill points array
  let i = 1;

  //->get markers
  for (marker of map.markers) {
    let pos = marker.position;
    let point = { id: marker.id, lat: pos.lat, lng: pos.lng, map: map._id };
    if (marker.type == 'stairway') point.flag = 'stairway';
    points.push(point);
  }

  //-->get polyPoints
  for (poly of map.polylines) {
    let nodes = poly.nodes;
    poly.points = [];
    for (node of nodes) {
      points.push({ id: i, lat: node.lat, lng: node.lng, map: map._id });
      poly.points.push(i);
      i++;
    }
  }

  //-->merge close points
  for (a of points) {
    let same = points.filter(b => {
      if (b.fwd) return false;
      let dist = Math.sqrt(Math.pow(a.lat - b.lat, 2) + Math.pow(a.lng - b.lng, 2));
      let r = dist <= threshold && dist != 0 ? true : false;
      return r;
    });

    for (item of same) {
      points[points.indexOf(item)].lat = a.lat;
      points[points.indexOf(item)].lng = a.lng;
      points[points.indexOf(item)].alias = a.id;
    }
  }

  //add connections to array
  for (poly of map.polylines) {
    let points = poly.points;
    let last;
    for (p of points) {
      if (last) {
        connections.push({ start: getRealId(last), end: getRealId(p) });
      }
      last = p;
    }
  }

  for (var x = connections.length - 1; x >= 0; x--) {
    for (var y = x - 1; y >= 0; y--) {
      var intersect = checkIntersect(connections[x], connections[y]);
      if (intersect) {
        points.push({ id: i, lat: intersect[0], lng: intersect[1], map: map._id });

        var l1_1 = { start: connections[x].start, end: i };
        var l1_2 = { start: i, end: connections[x].end };
        connections.push(l1_1, l1_2);
        connections[x].del = true;

        var l2_1 = { start: connections[y].start, end: i };
        var l2_2 = { start: i, end: connections[y].end };
        connections.push(l2_1, l2_2);
        connections[y].del = true;

        i++;
      }
    }
  }

  connections = connections.filter(c => {
    return !c.del;
  });

  for (point of points) {
    graph.addNode(map.name + '_' + point.id, point);
  }

  for (link of connections) {
    var a = points.find(p => {
      return p.id == link.start;
    });
    var b = points.find(p => {
      return p.id == link.end;
    });
    var dist = Math.sqrt(Math.pow(a.lat - b.lat, 2) + Math.pow(a.lng - b.lng, 2));
    var data = { weight: dist };
    graph.addLink(map.name + '_' + link.start, map.name + '_' + link.end, data);
  }

  for (marker of map.markers) {
    if (marker.type == 'stairway') {
      var a = { id: marker.id, lat: marker.pos.lat, lng: marker.pos.lng };
      var b = { id: marker.exit.id, lat: marker.exit.position.lat, lng: marker.exit.position.lng };
      var data = { weight: 40 };
      graph.addLink(map.name + '_' + a.id, marker.exit.map + '_' + b.id, data);
    }
  }

  //check for intersecting connections
  function checkIntersect(l1, l2) {
    //convert lines and check for same points
    var arr = [l1.start, l1.end, l2.start, l2.end];
    if (
      arr.some((value, index, array) => {
        return array.indexOf(value, index + 1) !== -1;
      })
    )
      return false;

    l1 = connectionToLine(l1);
    l2 = connectionToLine(l2);

    //checks for intersect
    var s1_x, s1_y, s2_x, s2_y;
    s1_x = l1.p2[0] - l1.p1[0];
    s1_y = l1.p2[1] - l1.p1[1];
    s2_x = l2.p2[0] - l2.p1[0];
    s2_y = l2.p2[1] - l2.p1[1];

    var s, t;
    s = (-s1_y * (l1.p1[0] - l2.p1[0]) + s1_x * (l1.p1[1] - l2.p1[1])) / (-s2_x * s1_y + s1_x * s2_y);
    t = (s2_x * (l1.p1[1] - l2.p1[1]) - s2_y * (l1.p1[0] - l2.p1[0])) / (-s2_x * s1_y + s1_x * s2_y);

    if (s >= 0 - lineThreshold && s <= 1 + lineThreshold && t >= 0 - lineThreshold && t <= 1 + lineThreshold) {
      var i_x = l1.p1[0] + t * s1_x;
      var i_y = l1.p1[1] + t * s1_y;
      return [i_x, i_y];
    } else {
      return false;
    }
  }

  function connectionToLine(c) {
    var p1 = points.find(p => {
      return p.id == c.start;
    });
    var p2 = points.find(p => {
      return p.id == c.end;
    });
    var l = { p1: [p1.lat, p1.lng], p2: [p2.lat, p2.lng] };
    return l;
  }

  function getRealId(id) {
    var point = points.find(p => {
      return p.id == id;
    });
    return point.alias ? point.alias : point.id;
  }
}

function findPath(fromMap, fromId, toMap, toId) {
  let createGraph = require('ngraph.graph');
  let graph = createGraph();

  if (!fs.existsSync(cachedGraph)) {
    console.log('No graph found');
    return false;
  }

  var data = fs.readJSONSync(cachedGraph);
  data = JSON.parse(data);

  for (link of data.links) {
    graph.addLink(link.fromId, link.toId, link.data);
  }

  for (node of data.nodes) {
    graph.addNode(node.id, node.data);
  }

  let pathN = require('ngraph.path');
  let pathFinder = pathN.nba(graph, {
    distance(a, b, link) {
      return link.data.weight;
    }
  });

  try {
    let p = pathFinder.find(fromMap + '_' + fromId, toMap + '_' + toId);
    return p;
  } catch (err) {
    console.log(err);
    return false;
  }
}

module.exports = { cacheGraph, findPath };
