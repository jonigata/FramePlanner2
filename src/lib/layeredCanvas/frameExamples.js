export const frameExamples = [
  { // オーソドックス
    bgColor: "white",
    height: 100,
    row: [
      {
        margin: {
          top: 4,
          bottom: 4,
          left: 8,
          right: 8,
        },
        width: 180,
        divider: {
          spacing: 2,
          slant: 0,
        },
        column: [
          { height: 17, divider: { spacing: 2, slant: 0 }, },
          { height: 25, 
            divider: { spacing: 2, slant: 0 },
            row: [
              { width: 45, divider: { spacing: 2, slant: 0 }, }, 
              { width: 55 }
            ],
          },
          { height: 17 },
        ],
      },
    ],
  },
  { // 一コマ
    bgColor: "white",
    height: 100,
    row: [
      {
        margin: {
          top: 4,
          bottom: 4,
          left: 4,
          right: 4,
        },
        width: 180,
        column: [
          {
            height: 180,
          },
        ],
      },
    ]
  },
  { // 4コマ
    bgColor: "white",
    height: 100,
    row: [
      {
        margin: {
          top: 1,
          bottom: 1,
          left: 2,
          right: 2,
        },
        width: 3,
        divider: {
          spacing: 1,
          slant: 0,
        },
        column: [
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
  { // オーソドックス2
    bgColor: "white",
    height: 100,
    row: [
      {
        column: [
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
        ],
        divider: {
          spacing: 4,
          slant: 0,
        },
        margin: {
          top: 4,
          bottom: 4,
          left: 4,
          right: 4,
        },
        height: 180,
      },
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
