export const frameExamples = [
  {
    frameTree: { // オーソドックス
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
    bubbles: []
  },
  {
    frameTree: { // 一コマ
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
    bubbles: []
  },
  {
    frameTree: { // 一コマ(マージンなし)
      bgColor: "white",
      height: 100,
      column: [
        {
          visibility: 1,
          height: 100,
        },
      ],
    },
    bubbles: []
  },
  {
    frameTree: { // 4コマ
      bgColor: "white",
      height: 100,
      column: [
        { height: 4, visibility: 0  },
        {
          height: 100,
          row: [
            { width: 2, visibility: 0  },
            { 
              width: 3,
              column: [
                {
                  height: 5,
                  column: [
                    { height: 2, pseudo: true, divider: { spacing: 1, slant: 0 }  },
                  ],
                  divider: { spacing: 2, slant: 0 }
                },
                {
                  height: 100,
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
              ],
            },
            { width: 2, visibility: 0  },
          ]
        },
        { height: 4, visibility: 0  },
      ]
    },
    bubbles: [
      {
        n_p0: [0.25,0.026],
        n_p1: [0.75,0.089],
        text: "タイトル",
        shape: "none",
        direction: "h",
        autoNewline: false,
        embedded: true,
      }
    ]
  },
  {
    frameTree: { // 4コマ2段
      bgColor: "white",
      height: 100,
      column: [
        { height: 4, visibility: 0  },
        {
          height: 100,
          row: [
            { width: 1, visibility: 0  },
            { 
              width: 5,
              column: [
                {
                  height: 5,
                  column: [
                    { height: 2, pseudo: true, divider: { spacing: 1, slant: 0 }  },
                  ],
                  divider: { spacing: 2, slant: 0 }
                },
                {
                  height: 100,
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
              ],
              divider: { spacing: 1, slant: 0 },
            },
            { 
              width: 5,
              column: [
                {
                  height: 5,
                  column: [
                    { height: 2, pseudo: true, divider: { spacing: 1, slant: 0 }  },
                  ],
                  divider: { spacing: 2, slant: 0 }
                },
                {
                  height: 100,
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
              ],
            },
            { width: 1, visibility: 0  },
          ]
        },
        { height: 4, visibility: 0  },
      ]
    },
    bubbles: [
      {
        n_p0: [0.04,0.026],
        n_p1: [0.50,0.089],
        text: "タイトル",
        shape: "none",
        direction: "h",
        autoNewline: false,
        embedded: true,
      },
      {
        n_p0: [0.50,0.026],
        n_p1: [0.96,0.089],
        text: "タイトル",
        shape: "none",
        direction: "h",
        autoNewline: false,
        embedded: true,
      }
    ]
  },
  {
    frameTree: { // オーソドックス2
      height: 100,
      bgColor: "white",
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
    bubbles: []
  },
  {
    frameTree: {
      bgColor: "transparent",
      borderWidth: 0,
    },
    bubbles: []
  }
];

export const aiTemplates = [
  // 2コマ
  {
    frameTree: {
      "bgColor": "white",
      "row": [
        {
          "visibility": 0,
          "width": 3
        },
        {
          "column": [
            {
              "visibility": 0,
              "height": 3
            },
            {
              "divider": {
                "spacing": 4
              },
              "height": 88
            },
            {
              "height": 88
            },
            {
              "visibility": 0,
              "height": 3
            }
          ],
          "width": 120
        },
        {
          "visibility": 0,
          "width": 3
        }
      ],
      "height": 100
    },
    bubbles: []
  },
  // 3コマ
  {
    frameTree: {
      "bgColor": "white",
      "row": [
        {
          "visibility": 0,
          "width": 3
        },
        {
          "column": [
            {
              "visibility": 0,
              "height": 3
            },
            {
              "row": [
                {
                  "divider": {
                    "spacing": 3
                  },
                  "width": 86
                },
                {
                  "width": 86
                }
              ],
              "divider": {
                "spacing": 4
              },
              "height": 96
            },
            {
              "height": 80
            },
            {
              "visibility": 0,
              "height": 3
            }
          ],
          "width": 120
        },
        {
          "visibility": 0,
          "width": 3
        }
      ],
      "height": 100
    },
    bubbles: []
  },
  // 4コマ
  {
    frameTree:  {
      "bgColor": "white",
      "row": [
        {
          "visibility": 0,
          "width": 3
        },
        {
          "column": [
            {
              "visibility": 0,
              "height": 3
            },
            {
              "row": [
                {
                  "divider": {
                    "spacing": 3
                  },
                  "width": 86
                },
                {
                  "width": 86
                }
              ],
              "divider": {
                "spacing": 4
              },
              "height": 55
            },
            {
              "divider": {
                "spacing": 4
              },
              "height": 40
            },
            {
              "height": 75
            },
            {
              "visibility": 0,
              "height": 3
            }
          ],
          "width": 120
        },
        {
          "visibility": 0,
          "width": 3
        }
      ],
      "height": 100
    },
    bubbles: []
  },
  // 5コマ
  {
    frameTree: {
      "bgColor": "white",
      "row": [
        {
          "visibility": 0,
          "width": 3
        },
        {
          "column": [
            {
              "visibility": 0,
              "height": 3
            },
            {
              "row": [
                {
                  "divider": {
                    "spacing": 3
                  },
                  "width": 85
                },
                {
                  "width": 85
                }
              ],
              "divider": {
                "spacing": 4
              },
              "height": 55
            },
            {
              "divider": {
                "spacing": 4
              },
              "height": 40
            },
            {
              "row": [
                {
                  "divider": {
                    "spacing": 3
                  },
                  "width": 75
                },
                {
                  "width": 75
                }
              ],
              "height": 80
            },
            {
              "visibility": 0,
              "height": 3
            }
          ],
          "width": 120
        },
        {
          "visibility": 0,
          "width": 3
        }
      ],
      "height": 100
    },
    bubbles: []
  },
  // 6コマ
  {
    frameTree: {
      "bgColor": "white",
      "row": [
        {
          "visibility": 0,
          "width": 3
        },
        {
          "column": [
            {
              "visibility": 0,
              "height": 3
            },
            {
              "row": [
                {
                  "divider": {
                    "spacing": 3
                  },
                  "width": 65
                },
                {
                  "width": 105
                }
              ],
              "divider": {
                "spacing": 4
              },
              "height": 65
            },
            {
              "row": [
                {
                  "divider": {
                    "spacing": 2
                  },
                  "width": 60
                },
                {
                  "width": 30
                }
              ],
              "divider": {
                "spacing": 4
              },
              "height": 45
            },
            {
              "row": [
                {
                  "divider": {
                    "spacing": 3
                  },
                  "width": 75
                },
                {
                  "width": 75
                }
              ],
              "height": 65
            },
            {
              "visibility": 0,
              "height": 3
            }
          ],
          "width": 120
        },
        {
          "visibility": 0,
          "width": 3
        }
      ],
      "height": 100
    },
    bubbles: []
  },
  // 7コマ
  {
    frameTree: {
      "bgColor": "white",
      "row": [
        {
          "visibility": 0,
          "width": 3
        },
        {
          "column": [
            {
              "visibility": 0,
              "height": 3
            },
            {
              "row": [
                {
                  "divider": {
                    "spacing": 3
                  },
                  "width": 65
                },
                {
                  "width": 105
                }
              ],
              "divider": {
                "spacing": 4
              },
              "height": 65
            },
            {
              "row": [
                {
                  "divider": {
                    "spacing": 2
                  },
                  "width": 60
                },
                {
                  "width": 30
                }
              ],
              "divider": {
                "spacing": 4
              },
              "height": 45
            },
            {
              "row": [
                {
                  "width": 75,
                  "column": [
                    {
                      "height": 40,
                      "divider": {
                        "spacing": 2
                      },
                    },
                    {
                      "height": 40
                    }
                  ],
                  "divider": {
                    "spacing": 3
                  },
                },
                {
                  "width": 75
                },
              ],
              "height": 110
            },
            {
              "visibility": 0,
              "height": 3
            }
          ],
          "width": 120
        },
        {
          "visibility": 0,
          "width": 3
        }
      ],
      "height": 100
    },
    bubbles: []
  },
  // 8コマ
  {
    frameTree: {
      "bgColor": "white",
      "row": [
        {
          "visibility": 0,
          "width": 3
        },
        {
          "column": [
            {
              "visibility": 0,
              "height": 3
            },
            {
              "row": [
                {
                  "divider": {
                    "spacing": 3
                  },
                  "width": 65
                },
                {
                  "width": 105
                }
              ],
              "divider": {
                "spacing": 4
              },
              "height": 65
            },
            {
              "row": [
                {
                  "divider": {
                    "spacing": 2
                  },
                  "width": 60
                },
                {
                  "width": 30
                }
              ],
              "divider": {
                "spacing": 4
              },
              "height": 45
            },
            {
              "row": [
                {
                  "divider": {
                    "spacing": 3
                  },
                  "width": 75
                },
                {
                  "width": 75
                }
              ],
              "divider": {
                "spacing": 4
              },
              "height": 50
            },
            {
              "row": [
                {
                  "divider": {
                    "spacing": 3
                  },
                  "width": 70
                },
                {
                  "width": 80
                }
              ],
              "height": 65
            },
            {
              "visibility": 0,
              "height": 3
            }
          ],
          "width": 120
        },
        {
          "visibility": 0,
          "width": 3
        }
      ],
      "height": 100
    },
    bubbles: []
  },
]