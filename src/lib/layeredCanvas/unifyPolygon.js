import * as paper from 'paper';

export function unifyEllipse(ctx) {
  const ellipse1 = new paper.Path.Ellipse({
    center: [100, 100],
    radius: [50, 80],
  });
  
  const ellipse2 = new paper.Path.Ellipse({
    center: [150, 100],
    radius: [50, 80],
  });
  
  const unified = ellipse1.unite(ellipse2);
  const path = new Path2D(unified.pathData);
  ctx.stroke(path);
};
