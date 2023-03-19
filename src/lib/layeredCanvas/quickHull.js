/**
 * QuickHull.js
 *
 * Implementation of the QuickHull algorithm for finding convex hull of a set of points
 *
 * @author Clay Gulick
 */

var hull = [];

export function QuickHull(points) {
    hull = [];
    //if there are only three points, this is a triangle, which by definition is already a hull
    if(points.length == 3) {
        points.push(points[0]); //close the poly
        return points;
    }
    var baseline = getMinMaxPoints(points);
    addSegments(baseline, points);
    addSegments([baseline[1], baseline[0]], points); //reverse line direction to get points on other side
    //add the last point to make a closed loop
    hull.push(hull[0]);
    return hull;
}

/**
 * Return the min and max points in the set along the X axis
 * Returns [ {x,y}, {x,y} ]
 * @param {Array} points - An array of {x,y} objects
 */
function getMinMaxPoints(points) {
    var i;
    var minPoint;
    var maxPoint;

    minPoint = points[0];
    maxPoint = points[0];

    for(i=1; i<points.length; i++) {
        if(points[i].x < minPoint.x)
            minPoint = points[i];
        if(points[i].x > maxPoint.x)
            maxPoint = points[i];
    }

    return [minPoint, maxPoint];
}

/**
 * Calculates the distance of a point from a line
 * @param {Array} point - Array [x,y]
 * @param {Array} line - Array of two points [ [x1,y1], [x2,y2] ]
 */
function distanceFromLine(point, line) {
    var vY = line[1].y - line[0].y;
    var vX = line[0].x - line[1].x;
    return (vX * (point.y - line[0].y) + vY * (point.x - line[0].x))
}

/**
 * Determines the set of points that lay outside the line (positive), and the most distal point
 * Returns: {points: [ [x1, y1], ... ], max: [x,y] ]
 * @param points
 * @param line
 */
function distalPoints(line, points) {
    var i;
    var outer_points = [];
    var point;
    var distal_point;
    var distance=0;
    var max_distance=0;

    for(i=0; i<points.length; i++) {
        point = points[i];
        distance = distanceFromLine(point,line);

        if(distance > 0) outer_points.push(point);
        else continue; //short circuit

        if(distance > max_distance) {
            distal_point = point;
            max_distance = distance;
        }

    }

    return {points: outer_points, max: distal_point};
}

/**
 * Recursively adds hull segments
 * @param line
 * @param points
 */
function addSegments(line, points) {
    var distal = distalPoints(line, points);
    if(!distal.max) return hull.push(line[0]);
    addSegments([line[0], distal.max], distal.points);
    addSegments([distal.max, line[1]], distal.points);
}
