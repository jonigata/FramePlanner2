declare module paper {
  export class Path extends paper.PathItem {
    closed: boolean;
    readonly pathData: string;
    addSegments(segments: paper.SegmentLike[] | paper.PointLike[]): void;
    moveTo(point: paper.PointLike): void;
    lineTo(point: paper.PointLike): void;
    rotate(angle: number, center: paper.PointLike): void;
  }
}
