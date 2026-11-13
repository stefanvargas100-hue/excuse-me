import '../../../../src/main.js';
import * as people from '../../../../src/sim/people.js';
import {PROTO} from '../../../../src/online/duel.js';
import {MEDAL_TIMES,medalFor} from '../../../../src/config/medals.js';
import {STAGE_STYLE} from '../../../../src/config/styles.js';
import {beltInfo} from '../../../../src/config/strips.js';
Object.assign(window.__excuse,{...people,PROTO,MEDAL_TIMES,medalFor,STAGE_STYLE,beltInfo});
