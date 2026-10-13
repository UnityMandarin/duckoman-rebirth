import {JourneyScene} from './JourneyScene';
export class JailScene extends JourneyScene {constructor(){super('jail');}}
export class OutsideScene extends JourneyScene {constructor(){super('outside');}}

export class CrimsonScene extends JourneyScene {constructor(){super('crimson');}}
export class RegentPracticeScene extends JourneyScene {constructor(){super('outside','regent-practice');}}
export class CrabPracticeScene extends JourneyScene {constructor(){super('crimson','crab-practice');}}
