export const frameExamples = [
  { // オーソドックス
    bgColor: "white",
    height: 100,
    row: [
      {
        width: 4, visibility: 0
      },
      {
        width: 180,
        column: [
          { height: 2, visibility: 0 },
          { height: 17, divider: { spacing: 2, slant: 0 }, },
          { height: 25, 
            divider: { spacing: 2, slant: 0 },
            row: [
              { width: 45, divider: { spacing: 2, slant: 0 }, }, 
              { width: 55 }
            ],
          },
          { height: 17 },
          { height: 2, visibility: 0 },
        ],
      },
      {
        width: 4, visibility: 0
      },
    ],
  },
  { // 一コマ
    bgColor: "white",
    height: 100,
    row: [
      { width: 3, visibility: 0 },
      {
        width: 120,
        column: [
          {
            height: 3, visibility: 0 ,
          },
          {
            height: 180,
          },
          {
            height: 3, visibility: 0 ,
          },
        ],
      },
      { width: 3, visibility: 0  },
    ]
  },
  { // 4コマ
    bgColor: "white",
    height: 100,
    column: [
      { height: 4, visibility: 0  },
      {
        bgColor: "white",
        height: 100,
        row: [
          { width: 2, visibility: 0  },
          {
            width: 3,
            column: [
              { height: 2, divider: { spacing: 1, slant: 0 }  },
              {
                height: 8, divider: { spacing: 1, slant: 0 }, 
              },
              {
                height: 8, divider: { spacing: 1, slant: 0 }, 
              },
              {
                height: 8, divider: { spacing: 1, slant: 0 }, 
              },
              {
                height: 8,
              },
            ],
          },
          { width: 2, visibility: 0  },
        ]
      },
      { height: 4, visibility: 0  },
    ]
  },
  { // 4コマ2段
    bgColor: "white",
    column: [
      { height: 4, visibility: 0  },
      {
        height: 100,
        row: [
          { width: 8, visibility: 0  },
          {
            bgColor: "white",
            width: 100,
            row: [
              {
                width: 3,
                column: [
                  {
                    height: 2, divider: { spacing: 1, slant: 0 }, 
                  },
                  {
                    height: 8, divider: { spacing: 1, slant: 0 }, 
                  },
                  {
                    height: 8, divider: { spacing: 1, slant: 0 }, 
                  },
                  {
                    height: 8, divider: { spacing: 1, slant: 0 }, 
                  },
                  {
                    height: 8,
                  },
                ],
              },
            ],
            divider: { spacing: 8, slant: 0 }, 
          },
          {
            bgColor: "white",
            width: 100,
            row: [
              {
                width: 3,
                column: [
                  {
                    height: 2, divider: { spacing: 1, slant: 0 }, 
                  },
                  {
                    height: 8, divider: { spacing: 1, slant: 0 }, 
                  },
                  {
                    height: 8, divider: { spacing: 1, slant: 0 }, 
                  },
                  {
                    height: 8, divider: { spacing: 1, slant: 0 }, 
                  },
                  {
                    height: 8,
                  },
                ],
              },
            ]
          },

          { width: 8, visibility: 0  }
        ],
      },
      { height: 4, visibility: 0  },
    ],
  },
  { // オーソドックス2
    bgColor: "white",
    height: 100,
    row: [
      { width: 4, visibility: 0  },
      {
        column: [
          { height: 4, visibility: 0  },
          {
            height: 60,
            divider: { spacing: 4, slant: 0 }, 
          },
          {
            row: [
              {
                width: 30,
                divider: { spacing: 2, slant: 0 }, 
              },
              {
                column: [
                  {
                    height: 30,
                    divider: { spacing: 2, slant: 0 }, 
                  },
                  {
                    height: 30,
                  },
                ],
                width: 30,
              },
            ],
            height: 120,
          },
          { height: 4, visibility: 0  },
        ],
        height: 180,
      },
      { height: 4, visibility: 0  },
    ]
  },
  {
    bgColor: "transparent",
    borderWidth: 0,
  },
/*
  {
    margin: {
      top: 10,
      bottom: 10,
      left: 10,
      right: 10,
    },
    width: 80,
    bgColor: "white",
    column: [
      {
        size: 80,
      },
    ],
  },
*/
];
