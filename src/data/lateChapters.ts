import type {Encounter} from './chapterChallenges';
export type LateChapterKey='stormworks'|'crown-edge';
export interface LatePlatform {x:number;top:number;width:number;}
export interface LateRoom {name:string;entryTop:number;exitTop:number;exitWidth?:number;steps:readonly LatePlatform[];machines:NonNullable<Encounter['moving']>;robots:readonly {step:number;type:'guard'|'jumper'|'pointed'}[];}
export const LATE_ROOM_WIDTH=1440,LATE_CHAPTER_LENGTH=17280;
export const LATE_CHECKPOINTS=[0,...[0,2,4,6,8,10].map(i=>i*1440+80)] as const;
/** Authored traversal order: repeated X reversals are intentional; never sort steps by X. */
/** Room signatures include ordered path shape and elevation changes; do not sort steps by X. */
export const LATE_ROOMS:Record<LateChapterKey,readonly LateRoom[]>={
  "stormworks": [
    {
      "name": "Signal Ramparts",
      "entryTop": 360,
      "exitTop": 360,
      "steps": [
        {
          "x": 230,
          "top": 296,
          "width": 112
        },
        {
          "x": 341.11,
          "top": 232,
          "width": 112
        },
        {
          "x": 452.22,
          "top": 168,
          "width": 112
        },
        {
          "x": 563.33,
          "top": 104,
          "width": 192
        },
        {
          "x": 674.44,
          "top": 40,
          "width": 112
        },
        {
          "x": 785.56,
          "top": 40,
          "width": 112
        },
        {
          "x": 896.67,
          "top": 104,
          "width": 192
        },
        {
          "x": 1007.78,
          "top": 168,
          "width": 112
        },
        {
          "x": 1118.89,
          "top": 232,
          "width": 112
        },
        {
          "x": 1230,
          "top": 296,
          "width": 112
        }
      ],
      "machines": [],
      "robots": []
    },
    {
      "name": "Counterweight Yard",
      "entryTop": 360,
      "exitTop": 360,
      "steps": [
        {
          "x": 230,
          "top": 288,
          "width": 112
        },
        {
          "x": 341.11,
          "top": 216,
          "width": 112
        },
        {
          "x": 452.22,
          "top": 160,
          "width": 112
        },
        {
          "x": 563.33,
          "top": 104,
          "width": 192
        },
        {
          "x": 674.44,
          "top": 48,
          "width": 112
        },
        {
          "x": 785.56,
          "top": 48,
          "width": 112
        },
        {
          "x": 896.67,
          "top": 104,
          "width": 192
        },
        {
          "x": 1007.78,
          "top": 176,
          "width": 112
        },
        {
          "x": 1118.89,
          "top": 240,
          "width": 112
        },
        {
          "x": 1230,
          "top": 296,
          "width": 112
        }
      ],
      "machines": [
        {
          "step": 1,
          "type": "lift"
        }
      ],
      "robots": []
    },
    {
      "name": "Turbine Switchbacks",
      "entryTop": 360,
      "exitTop": 360,
      "steps": [
        {
          "x": 230,
          "top": 304,
          "width": 112
        },
        {
          "x": 341.11,
          "top": 248,
          "width": 112
        },
        {
          "x": 452.22,
          "top": 176,
          "width": 112
        },
        {
          "x": 563.33,
          "top": 104,
          "width": 192
        },
        {
          "x": 674.44,
          "top": 32,
          "width": 112
        },
        {
          "x": 785.56,
          "top": 32,
          "width": 112
        },
        {
          "x": 896.67,
          "top": 96,
          "width": 192
        },
        {
          "x": 1007.78,
          "top": 160,
          "width": 112
        },
        {
          "x": 1118.89,
          "top": 224,
          "width": 112
        },
        {
          "x": 1230,
          "top": 296,
          "width": 112
        }
      ],
      "machines": [
        {
          "step": 1,
          "type": "conveyor",
          "direction": -1,
          "strength": 70
        },
        {
          "step": 7,
          "type": "conveyor",
          "direction": 1,
          "strength": 80
        }
      ],
      "robots": [
        {
          "step": 3,
          "type": "guard"
        }
      ]
    },
    {
      "name": "Suspended Assembly",
      "entryTop": 360,
      "exitTop": 360,
      "steps": [
        {
          "x": 230,
          "top": 296,
          "width": 112
        },
        {
          "x": 341.11,
          "top": 240,
          "width": 112
        },
        {
          "x": 452.22,
          "top": 184,
          "width": 112
        },
        {
          "x": 563.33,
          "top": 120,
          "width": 192
        },
        {
          "x": 674.44,
          "top": 56,
          "width": 112
        },
        {
          "x": 785.56,
          "top": 32,
          "width": 112
        },
        {
          "x": 896.67,
          "top": 88,
          "width": 192
        },
        {
          "x": 1007.78,
          "top": 152,
          "width": 112
        },
        {
          "x": 1118.89,
          "top": 216,
          "width": 112
        },
        {
          "x": 1230,
          "top": 296,
          "width": 112
        }
      ],
      "machines": [
        {
          "step": 4,
          "type": "ferry"
        }
      ],
      "robots": []
    },
    {
      "name": "Stormglass Towers",
      "entryTop": 360,
      "exitTop": 360,
      "steps": [
        {
          "x": 230,
          "top": 296,
          "width": 112
        },
        {
          "x": 341.11,
          "top": 224,
          "width": 112
        },
        {
          "x": 452.22,
          "top": 152,
          "width": 112
        },
        {
          "x": 563.33,
          "top": 88,
          "width": 192
        },
        {
          "x": 674.44,
          "top": 24,
          "width": 112
        },
        {
          "x": 785.56,
          "top": 24,
          "width": 112
        },
        {
          "x": 896.67,
          "top": 88,
          "width": 192
        },
        {
          "x": 1007.78,
          "top": 152,
          "width": 112
        },
        {
          "x": 1118.89,
          "top": 224,
          "width": 112
        },
        {
          "x": 1230,
          "top": 296,
          "width": 112
        }
      ],
      "machines": [
        {
          "step": 1,
          "type": "conveyor",
          "direction": -1,
          "strength": 70
        }
      ],
      "robots": []
    },
    {
      "name": "Piston Exchange",
      "entryTop": 360,
      "exitTop": 360,
      "steps": [
        {
          "x": 230,
          "top": 296,
          "width": 112
        },
        {
          "x": 341.11,
          "top": 240,
          "width": 112
        },
        {
          "x": 452.22,
          "top": 176,
          "width": 112
        },
        {
          "x": 563.33,
          "top": 112,
          "width": 192
        },
        {
          "x": 674.44,
          "top": 48,
          "width": 112
        },
        {
          "x": 785.56,
          "top": 40,
          "width": 112
        },
        {
          "x": 896.67,
          "top": 96,
          "width": 192
        },
        {
          "x": 1007.78,
          "top": 160,
          "width": 112
        },
        {
          "x": 1118.89,
          "top": 232,
          "width": 112
        },
        {
          "x": 1230,
          "top": 296,
          "width": 112
        }
      ],
      "machines": [
        {
          "step": 4,
          "type": "presses"
        },
        {
          "step": 7,
          "type": "conveyor",
          "direction": 1,
          "strength": 80
        }
      ],
      "robots": [
        {
          "step": 3,
          "type": "pointed"
        }
      ]
    },
    {
      "name": "Crosswind Galleries",
      "entryTop": 360,
      "exitTop": 360,
      "steps": [
        {
          "x": 230,
          "top": 296,
          "width": 112
        },
        {
          "x": 341.11,
          "top": 224,
          "width": 112
        },
        {
          "x": 452.22,
          "top": 168,
          "width": 112
        },
        {
          "x": 563.33,
          "top": 112,
          "width": 192
        },
        {
          "x": 674.44,
          "top": 48,
          "width": 112
        },
        {
          "x": 785.56,
          "top": 48,
          "width": 112
        },
        {
          "x": 896.67,
          "top": 112,
          "width": 192
        },
        {
          "x": 1007.78,
          "top": 176,
          "width": 112
        },
        {
          "x": 1118.89,
          "top": 240,
          "width": 112
        },
        {
          "x": 1230,
          "top": 296,
          "width": 112
        }
      ],
      "machines": [
        {
          "step": 3,
          "type": "ferry"
        }
      ],
      "robots": []
    },
    {
      "name": "Skyrail Transfer",
      "entryTop": 360,
      "exitTop": 360,
      "steps": [
        {
          "x": 230,
          "top": 296,
          "width": 112
        },
        {
          "x": 341.11,
          "top": 248,
          "width": 112
        },
        {
          "x": 452.22,
          "top": 184,
          "width": 112
        },
        {
          "x": 563.33,
          "top": 120,
          "width": 192
        },
        {
          "x": 674.44,
          "top": 56,
          "width": 112
        },
        {
          "x": 785.56,
          "top": 40,
          "width": 112
        },
        {
          "x": 896.67,
          "top": 104,
          "width": 192
        },
        {
          "x": 1007.78,
          "top": 168,
          "width": 112
        },
        {
          "x": 1118.89,
          "top": 232,
          "width": 112
        },
        {
          "x": 1230,
          "top": 296,
          "width": 112
        }
      ],
      "machines": [
        {
          "step": 4,
          "type": "ferry"
        }
      ],
      "robots": []
    },
    {
      "name": "Sentinel Batteries",
      "entryTop": 360,
      "exitTop": 360,
      "steps": [
        {
          "x": 230,
          "top": 296,
          "width": 112
        },
        {
          "x": 341.11,
          "top": 232,
          "width": 112
        },
        {
          "x": 452.22,
          "top": 160,
          "width": 112
        },
        {
          "x": 563.33,
          "top": 96,
          "width": 192
        },
        {
          "x": 674.44,
          "top": 32,
          "width": 112
        },
        {
          "x": 785.56,
          "top": 32,
          "width": 112
        },
        {
          "x": 896.67,
          "top": 96,
          "width": 192
        },
        {
          "x": 1007.78,
          "top": 160,
          "width": 112
        },
        {
          "x": 1118.89,
          "top": 232,
          "width": 112
        },
        {
          "x": 1230,
          "top": 296,
          "width": 112
        }
      ],
      "machines": [],
      "robots": [
        {
          "step": 3,
          "type": "guard"
        },
        {
          "step": 7,
          "type": "guard"
        }
      ]
    },
    {
      "name": "Broken Dynamo",
      "entryTop": 360,
      "exitTop": 360,
      "steps": [
        {
          "x": 230,
          "top": 296,
          "width": 112
        },
        {
          "x": 341.11,
          "top": 232,
          "width": 112
        },
        {
          "x": 452.22,
          "top": 168,
          "width": 112
        },
        {
          "x": 563.33,
          "top": 104,
          "width": 192
        },
        {
          "x": 674.44,
          "top": 40,
          "width": 112
        },
        {
          "x": 785.56,
          "top": 104,
          "width": 112
        },
        {
          "x": 896.67,
          "top": 168,
          "width": 192
        },
        {
          "x": 1007.78,
          "top": 232,
          "width": 112
        },
        {
          "x": 1118.89,
          "top": 296,
          "width": 112
        },
        {
          "x": 1230,
          "top": 296,
          "width": 112
        }
      ],
      "machines": [
        {
          "step": 6,
          "type": "lift"
        }
      ],
      "robots": []
    },
    {
      "name": "Storm Crown",
      "entryTop": 360,
      "exitTop": 360,
      "steps": [
        {
          "x": 230,
          "top": 296,
          "width": 112
        },
        {
          "x": 341.11,
          "top": 232,
          "width": 112
        },
        {
          "x": 452.22,
          "top": 152,
          "width": 112
        },
        {
          "x": 563.33,
          "top": 88,
          "width": 192
        },
        {
          "x": 674.44,
          "top": 32,
          "width": 112
        },
        {
          "x": 785.56,
          "top": 24,
          "width": 112
        },
        {
          "x": 896.67,
          "top": 96,
          "width": 192
        },
        {
          "x": 1007.78,
          "top": 160,
          "width": 112
        },
        {
          "x": 1118.89,
          "top": 232,
          "width": 112
        },
        {
          "x": 1230,
          "top": 296,
          "width": 112
        }
      ],
      "machines": [
        {
          "step": 1,
          "type": "lift"
        },
        {
          "step": 4,
          "type": "presses"
        }
      ],
      "robots": [
        {
          "step": 3,
          "type": "guard"
        }
      ]
    },
    {
      "name": "The Upper Signal",
      "entryTop": 360,
      "exitTop": 360,
      "steps": [
        {
          "x": 230,
          "top": 296,
          "width": 112
        },
        {
          "x": 341.11,
          "top": 240,
          "width": 112
        },
        {
          "x": 452.22,
          "top": 184,
          "width": 112
        },
        {
          "x": 563.33,
          "top": 128,
          "width": 192
        },
        {
          "x": 674.44,
          "top": 72,
          "width": 112
        },
        {
          "x": 785.56,
          "top": 72,
          "width": 112
        },
        {
          "x": 896.67,
          "top": 128,
          "width": 192
        },
        {
          "x": 1007.78,
          "top": 184,
          "width": 112
        },
        {
          "x": 1118.89,
          "top": 240,
          "width": 112
        },
        {
          "x": 1230,
          "top": 296,
          "width": 112
        }
      ],
      "machines": [
        {
          "step": 7,
          "type": "conveyor",
          "direction": 1,
          "strength": 80
        }
      ],
      "robots": []
    }
  ],
  "crown-edge": [
    {
      "name": "Crown Threshold",
      "entryTop": 360,
      "exitTop": -60,
      "steps": [
        {
          "x": 250,
          "top": 300,
          "width": 160
        },
        {
          "x": 390,
          "top": 240,
          "width": 160
        },
        {
          "x": 530,
          "top": 180,
          "width": 224
        },
        {
          "x": 670,
          "top": 120,
          "width": 160
        },
        {
          "x": 810,
          "top": 60,
          "width": 160
        },
        {
          "x": 960,
          "top": 0,
          "width": 192
        },
        {
          "x": 1248,
          "top": -60,
          "width": 384
        }
      ],
      "machines": [],
      "robots": [],
      "exitWidth": 384
    },
    {
      "name": "Knife-Edge Galleries",
      "entryTop": -60,
      "exitTop": -340,
      "steps": [
        {
          "x": 230,
          "top": -100,
          "width": 160
        },
        {
          "x": 380,
          "top": -140,
          "width": 160
        },
        {
          "x": 530,
          "top": -180,
          "width": 224
        },
        {
          "x": 680,
          "top": -220,
          "width": 160
        },
        {
          "x": 830,
          "top": -260,
          "width": 160
        },
        {
          "x": 960,
          "top": -300,
          "width": 192
        },
        {
          "x": 1248,
          "top": -340,
          "width": 384
        }
      ],
      "machines": [
        {
          "step": 2,
          "type": "conveyor",
          "direction": -1,
          "strength": 90
        }
      ],
      "robots": [],
      "exitWidth": 384
    },
    {
      "name": "Reversing Spires",
      "entryTop": -340,
      "exitTop": -1140,
      "steps": [
        {
          "x": 300,
          "top": -420,
          "width": 160
        },
        {
          "x": 540,
          "top": -500,
          "width": 160
        },
        {
          "x": 210,
          "top": -580,
          "width": 224
        },
        {
          "x": 620,
          "top": -660,
          "width": 192
        },
        {
          "x": 850,
          "top": -740,
          "width": 160
        },
        {
          "x": 1120,
          "top": -820,
          "width": 224
        },
        {
          "x": 800,
          "top": -900,
          "width": 224
        },
        {
          "x": 1150,
          "top": -980,
          "width": 224
        },
        {
          "x": 760,
          "top": -1060,
          "width": 224
        },
        {
          "x": 1248,
          "top": -1140,
          "width": 384
        }
      ],
      "machines": [
        {
          "step": 1,
          "type": "ferry"
        }
      ],
      "robots": [
        {
          "step": 3,
          "type": "guard"
        }
      ],
      "exitWidth": 384
    },
    {
      "name": "Pendulum Court",
      "entryTop": -1140,
      "exitTop": -1540,
      "steps": [
        {
          "x": 250,
          "top": -1200,
          "width": 160
        },
        {
          "x": 400,
          "top": -1260,
          "width": 160
        },
        {
          "x": 550,
          "top": -1220,
          "width": 224
        },
        {
          "x": 700,
          "top": -1300,
          "width": 160
        },
        {
          "x": 850,
          "top": -1380,
          "width": 160
        },
        {
          "x": 960,
          "top": -1460,
          "width": 192
        },
        {
          "x": 1248,
          "top": -1540,
          "width": 384
        }
      ],
      "machines": [
        {
          "step": 2,
          "type": "lift"
        }
      ],
      "robots": [],
      "exitWidth": 384
    },
    {
      "name": "Shattered Meridian",
      "entryTop": -1540,
      "exitTop": -1820,
      "steps": [
        {
          "x": 230,
          "top": -1580,
          "width": 160
        },
        {
          "x": 380,
          "top": -1620,
          "width": 160
        },
        {
          "x": 530,
          "top": -1660,
          "width": 224
        },
        {
          "x": 680,
          "top": -1700,
          "width": 160
        },
        {
          "x": 830,
          "top": -1740,
          "width": 160
        },
        {
          "x": 960,
          "top": -1780,
          "width": 192
        },
        {
          "x": 1248,
          "top": -1820,
          "width": 384
        }
      ],
      "machines": [
        {
          "step": 1,
          "type": "conveyor",
          "direction": -1,
          "strength": 90
        },
        {
          "step": 3,
          "type": "presses"
        }
      ],
      "robots": [],
      "exitWidth": 384
    },
    {
      "name": "Crown Relay",
      "entryTop": -1820,
      "exitTop": -2380,
      "steps": [
        {
          "x": 270,
          "top": -1900,
          "width": 160
        },
        {
          "x": 410,
          "top": -1980,
          "width": 160
        },
        {
          "x": 550,
          "top": -2060,
          "width": 224
        },
        {
          "x": 690,
          "top": -2140,
          "width": 160
        },
        {
          "x": 830,
          "top": -2220,
          "width": 160
        },
        {
          "x": 960,
          "top": -2300,
          "width": 192
        },
        {
          "x": 1248,
          "top": -2380,
          "width": 384
        }
      ],
      "machines": [
        {
          "step": 3,
          "type": "presses"
        }
      ],
      "robots": [
        {
          "step": 3,
          "type": "guard"
        }
      ],
      "exitWidth": 384
    },
    {
      "name": "Needleworks",
      "entryTop": -2380,
      "exitTop": -2780,
      "steps": [
        {
          "x": 250,
          "top": -2420,
          "width": 160
        },
        {
          "x": 400,
          "top": -2500,
          "width": 160
        },
        {
          "x": 550,
          "top": -2460,
          "width": 224
        },
        {
          "x": 700,
          "top": -2540,
          "width": 160
        },
        {
          "x": 850,
          "top": -2620,
          "width": 160
        },
        {
          "x": 960,
          "top": -2700,
          "width": 192
        },
        {
          "x": 1248,
          "top": -2780,
          "width": 384
        }
      ],
      "machines": [
        {
          "step": 2,
          "type": "ferry"
        }
      ],
      "robots": [],
      "exitWidth": 384
    },
    {
      "name": "Silent Suspension",
      "entryTop": -2780,
      "exitTop": -3200,
      "steps": [
        {
          "x": 220,
          "top": -2840,
          "width": 160
        },
        {
          "x": 370,
          "top": -2900,
          "width": 160
        },
        {
          "x": 520,
          "top": -2960,
          "width": 224
        },
        {
          "x": 670,
          "top": -3020,
          "width": 160
        },
        {
          "x": 820,
          "top": -3080,
          "width": 160
        },
        {
          "x": 960,
          "top": -3140,
          "width": 192
        },
        {
          "x": 1248,
          "top": -3200,
          "width": 384
        }
      ],
      "machines": [
        {
          "step": 1,
          "type": "shutters"
        },
        {
          "step": 2,
          "type": "shutters"
        }
      ],
      "robots": [],
      "exitWidth": 384
    },
    {
      "name": "Astral Switchbacks",
      "entryTop": -3200,
      "exitTop": -3760,
      "steps": [
        {
          "x": 280,
          "top": -3280,
          "width": 160
        },
        {
          "x": 420,
          "top": -3360,
          "width": 160
        },
        {
          "x": 560,
          "top": -3440,
          "width": 224
        },
        {
          "x": 700,
          "top": -3520,
          "width": 160
        },
        {
          "x": 840,
          "top": -3600,
          "width": 160
        },
        {
          "x": 960,
          "top": -3680,
          "width": 192
        },
        {
          "x": 1248,
          "top": -3760,
          "width": 384
        }
      ],
      "machines": [
        {
          "step": 2,
          "type": "lift"
        }
      ],
      "robots": [],
      "exitWidth": 384
    },
    {
      "name": "Last Counterweight",
      "entryTop": -3760,
      "exitTop": -4200,
      "steps": [
        {
          "x": 230,
          "top": -3840,
          "width": 160
        },
        {
          "x": 390,
          "top": -3920,
          "width": 160
        },
        {
          "x": 550,
          "top": -3880,
          "width": 224
        },
        {
          "x": 710,
          "top": -3960,
          "width": 160
        },
        {
          "x": 850,
          "top": -4040,
          "width": 160
        },
        {
          "x": 960,
          "top": -4120,
          "width": 192
        },
        {
          "x": 1248,
          "top": -4200,
          "width": 384
        }
      ],
      "machines": [
        {
          "step": 2,
          "type": "conveyor",
          "direction": -1,
          "strength": 90
        }
      ],
      "robots": [],
      "exitWidth": 384
    },
    {
      "name": "The Expert Ascent",
      "entryTop": -4200,
      "exitTop": -4620,
      "steps": [
        {
          "x": 280,
          "top": -4260,
          "width": 160
        },
        {
          "x": 420,
          "top": -4320,
          "width": 160
        },
        {
          "x": 560,
          "top": -4380,
          "width": 224
        },
        {
          "x": 700,
          "top": -4440,
          "width": 160
        },
        {
          "x": 840,
          "top": -4500,
          "width": 160
        },
        {
          "x": 960,
          "top": -4560,
          "width": 192
        },
        {
          "x": 1248,
          "top": -4620,
          "width": 384
        }
      ],
      "machines": [
        {
          "step": 1,
          "type": "shutters"
        },
        {
          "step": 2,
          "type": "shutters"
        }
      ],
      "robots": [],
      "exitWidth": 384
    },
    {
      "name": "Signal of Dawn",
      "entryTop": -4620,
      "exitTop": -5180,
      "steps": [
        {
          "x": 230,
          "top": -4700,
          "width": 160
        },
        {
          "x": 380,
          "top": -4780,
          "width": 160
        },
        {
          "x": 530,
          "top": -4860,
          "width": 224
        },
        {
          "x": 680,
          "top": -4940,
          "width": 160
        },
        {
          "x": 830,
          "top": -5020,
          "width": 160
        },
        {
          "x": 960,
          "top": -5100,
          "width": 192
        },
        {
          "x": 1248,
          "top": -5180,
          "width": 384
        }
      ],
      "machines": [],
      "robots": [],
      "exitWidth": 384
    }
  ]
};
export function lateExitPlatform(room:LateRoom):LatePlatform{return {x:LATE_ROOM_WIDTH-(room.exitWidth??192)/2,top:room.exitTop,width:room.exitWidth??192};}
export function latePlatformCoversExit(platform:LatePlatform,exit:LatePlatform):boolean{return platform.top===exit.top&&platform.x-platform.width/2<=exit.x-exit.width/2&&platform.x+platform.width/2>=exit.x+exit.width/2;}
export function lateRoute(room:LateRoom):LatePlatform[]{const exit=lateExitPlatform(room),last=room.steps.at(-1)!;return [{x:96,top:room.entryTop,width:192},...room.steps,...(latePlatformCoversExit(last,exit)?[]:[exit])];}
export function latePreviewSpawn(key:LateChapterKey,section:number):{room:number;x:number;top:number}{const room=Math.max(0,Math.min(11,Math.floor(section))),data=LATE_ROOMS[key][room]!;return {room,x:room*LATE_ROOM_WIDTH+96,top:data.entryTop};}
export function lateStandingOnExit(room:LateRoom,roomIndex:number,body:{left:number;right:number;bottom:number},tolerance=12):boolean{const exit=lateExitPlatform(room),left=roomIndex*LATE_ROOM_WIDTH+exit.x-exit.width/2,right=roomIndex*LATE_ROOM_WIDTH+exit.x+exit.width/2;return body.right>left&&body.left<right&&Math.abs(body.bottom-exit.top)<=tolerance;}
