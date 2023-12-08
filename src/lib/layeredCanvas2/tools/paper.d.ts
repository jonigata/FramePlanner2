declare module paper {
  export class Path {
    addSegments(segments: Segment[] | Point[]): void;
    readonly pathData: string;
  }
}
