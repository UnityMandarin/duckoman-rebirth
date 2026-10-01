import {JourneyScene} from './JourneyScene';
export class JailScene extends JourneyScene {constructor(){super('jail');}}
export class OutsideScene extends JourneyScene {constructor(){super('outside');}}

export class CrimsonScene extends JourneyScene {constructor(){super('crimson');}}
export class RegentPracticeScene extends JourneyScene {constructor(){super('outside','regent-practice');}}
export class CrabPracticeScene extends JourneyScene {constructor(){super('crimson','crab-practice');}}
export class JailRoutePracticeScene extends JourneyScene {constructor(){super('jail','jail-route-practice');}}
export class OutsideRoutePracticeScene extends JourneyScene {constructor(){super('outside','outside-route-practice');}}
export class CrimsonRoutePracticeScene extends JourneyScene {constructor(){super('crimson','crimson-route-practice');}}
