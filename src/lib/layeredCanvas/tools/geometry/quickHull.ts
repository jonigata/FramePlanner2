/**
 * QuickHull.js
 *
 * Implementation of the QuickHull algorithm for finding convex hull of a set of points
 *
 * @author Clay Gulick
 */

type Point = [number, number];

var hull: Point[] = [];

export function QuickHull(points: Point[]): Point[] {
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
 * Returns [ [x,y], [x,y] ]
 * @param {Array} points - An array of {x,y} objects
 */
function getMinMaxPoints(points: Point[]): [Point, Point] {
	var i: number;
	var minPoint: Point;
	var maxPoint: Point;

	minPoint = points[0];
	maxPoint = points[0];

	for(i=1; i<points.length; i++) {
		if(points[i][0] < minPoint[0])
			minPoint = points[i];
		if(points[i][0] > maxPoint[0])
			maxPoint = points[i];
	}

	return [minPoint, maxPoint];
}

/**
 * Calculates the distance of a point from a line
 * @param {Array} point - Array [x,y]
 * @param {Array} line - Array of two points [ [x1,y1], [x2,y2] ]
 */
function distanceFromLine(point: Point, line: [Point, Point]) {
	var vY = line[1][1] - line[0][1];
	var vX = line[0][0] - line[1][0];
	return (vX * (point[1] - line[0][1]) + vY * (point[0] - line[0][0]))
}

/**
 * Determines the set of points that lay outside the line (positive), and the most distal point
 * Returns: {points: [ [x1, y1], ... ], max: [x,y] ]
 * @param points
 * @param line
 */
function distalPoints(line: [Point, Point], points: Point[]) {
	var i: number;
	var outer_points = [];
	var point: Point;
	var distal_point: Point;
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

	return {points: outer_points, max: distal_point!};
}

/**
 * Recursively adds hull segments
 * @param line
 * @param points
 */
function addSegments(line: [Point, Point], points: Point[]) {
	var distal = distalPoints(line, points);
	if(!distal.max) return hull.push(line[0]);
	addSegments([line[0], distal.max], distal.points);
	addSegments([distal.max, line[1]], distal.points);
}
